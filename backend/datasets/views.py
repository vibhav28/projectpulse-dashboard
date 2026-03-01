import pandas as pd
import io
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Dataset
from .serializers import DatasetSerializer

logger = logging.getLogger(__name__)

# Columns that typically hold issue status / priority in a JIRA CSV
_STATUS_COLS = ['Status', 'status', 'Issue Status', 'issue_status']
_PRIORITY_COLS = ['Priority', 'priority', 'Issue Priority', 'issue_priority']
_CREATED_COLS = ['Created', 'created', 'Created Date', 'created_date']
_RESOLVED_COLS = ['Resolved', 'resolved', 'Resolution Date', 'resolutiondate', 'Resolutiondate']
_SUMMARY_COLS = ['Summary', 'summary', 'Issue Summary', 'Title', 'title']
_TYPE_COLS = ['Issue Type', 'issuetype', 'IssueType', 'Type', 'type']


def _find_col(df, candidates):
    """Return the first matching column name, or None."""
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _read_csv_safe(dataset):
    """Open the dataset CSV and return a DataFrame, or None on error."""
    try:
        path = dataset.file.path
        # Try common encodings
        for enc in ('utf-8', 'latin-1', 'cp1252'):
            try:
                df = pd.read_csv(path, encoding=enc, low_memory=False)
                return df
            except UnicodeDecodeError:
                continue
        return None
    except Exception as e:
        logger.error(f"Failed to read CSV for dataset {dataset.id}: {e}")
        return None


class DatasetViewSet(viewsets.ModelViewSet):
    serializer_class = DatasetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        # Count rows and save
        try:
            df = _read_csv_safe(instance)
            if df is not None:
                instance.row_count = len(df)
                instance.file_size_bytes = instance.file.size
                instance.save()
        except Exception as e:
            logger.warning(f"Could not count rows for dataset {instance.id}: {e}")

    @action(detail=True, methods=['get'], url_path='analyse')
    def analyse(self, request, pk=None):
        """
        Read the uploaded CSV and return aggregated JIRA stats for the dashboard.
        """
        dataset = self.get_object()
        df = _read_csv_safe(dataset)
        if df is None:
            return Response(
                {'error': 'Could not read CSV file. Check encoding.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        total_rows = len(df)
        columns = list(df.columns)

        # ── Status breakdown ───────────────────────────────────────────────────
        status_col = _find_col(df, _STATUS_COLS)
        status_counts = {}
        if status_col:
            status_counts = (
                df[status_col]
                .fillna('Unknown')
                .value_counts()
                .head(10)
                .to_dict()
            )

        # ── Priority breakdown ─────────────────────────────────────────────────
        priority_col = _find_col(df, _PRIORITY_COLS)
        priority_counts = {}
        if priority_col:
            priority_counts = (
                df[priority_col]
                .fillna('Unknown')
                .value_counts()
                .head(10)
                .to_dict()
            )

        # ── Issue Type breakdown ───────────────────────────────────────────────
        type_col = _find_col(df, _TYPE_COLS)
        type_counts = {}
        if type_col:
            type_counts = (
                df[type_col]
                .fillna('Unknown')
                .value_counts()
                .head(8)
                .to_dict()
            )

        # ── Average resolution time ────────────────────────────────────────────
        avg_resolution_days = None
        created_col = _find_col(df, _CREATED_COLS)
        resolved_col = _find_col(df, _RESOLVED_COLS)
        if created_col and resolved_col:
            try:
                created = pd.to_datetime(df[created_col], errors='coerce', utc=True)
                resolved = pd.to_datetime(df[resolved_col], errors='coerce', utc=True)
                delta = (resolved - created).dt.days
                avg_resolution_days = round(float(delta.dropna().mean()), 1) if not delta.dropna().empty else None
            except Exception:
                pass

        # ── Preview rows (first 20) ────────────────────────────────────────────
        preview = df.head(20).fillna('').to_dict(orient='records')

        return Response({
            'dataset_id': str(dataset.id),
            'file_name': dataset.file_name,
            'total_rows': total_rows,
            'columns': columns,
            'status_col': status_col,
            'priority_col': priority_col,
            'type_col': type_col,
            'status_counts': status_counts,
            'priority_counts': priority_counts,
            'type_counts': type_counts,
            'avg_resolution_days': avg_resolution_days,
            'preview': preview,
        })

    @action(detail=True, methods=['get'], url_path='preview')
    def preview_text(self, request, pk=None):
        """
        Return a compact text summary of the first 50 rows (used by Groq context builder).
        """
        dataset = self.get_object()
        df = _read_csv_safe(dataset)
        if df is None:
            return Response({'error': 'Could not read CSV.'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        sample = df.head(50)
        text = f"Dataset: {dataset.file_name}\nColumns: {', '.join(df.columns.tolist())}\nTotal rows: {len(df)}\n\n"
        text += sample.fillna('').to_string(index=False, max_rows=50)
        return Response({'text': text, 'total_rows': len(df), 'columns': list(df.columns)})
