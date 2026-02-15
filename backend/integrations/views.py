from rest_framework import viewsets, permissions
from .models import JiraConnection, CachedTask
from .serializers import JiraConnectionSerializer, CachedTaskSerializer

class JiraConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = JiraConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JiraConnection.objects.filter(user=self.request.user)

class CachedTaskViewSet(viewsets.ModelViewSet):
    serializer_class = CachedTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CachedTask.objects.filter(jira_connection__user=self.request.user)
