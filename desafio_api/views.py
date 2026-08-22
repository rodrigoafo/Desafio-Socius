from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import viewsets

from .models import Application, Candidate, RecruitmentSearch
from .serializers import (
    ApplicationSerializer,
    CandidateSerializer,
    RecruitmentSearchSerializer,
)


class RecruitmentSearchViewSet(viewsets.ModelViewSet):
    """CRUD de búsquedas de reclutamiento."""

    serializer_class = RecruitmentSearchSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = RecruitmentSearch.objects.all().order_by("-opening_date")

        position = self.request.query_params.get("position")
        practice = self.request.query_params.get("practice")
        priority = self.request.query_params.get("priority")
        status = self.request.query_params.get("status")

        if position:
            queryset = queryset.filter(position__icontains=position)
        if practice:
            queryset = queryset.filter(practice__icontains=practice)
        if priority:
            queryset = queryset.filter(priority=priority)
        if status:
            queryset = queryset.filter(status=status)

        return queryset


class CandidateViewSet(viewsets.ModelViewSet):
    """CRUD de candidatos y consulta de la base de talentos."""

    serializer_class = CandidateSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = Candidate.objects.all().order_by("-created_at")

        name = self.request.query_params.get("name")
        email = self.request.query_params.get("email")
        region = self.request.query_params.get("region")
        modality = self.request.query_params.get("modality")
        recruitment_search = self.request.query_params.get("search")

        if name:
            queryset = queryset.filter(
                Q(first_name__icontains=name) | Q(last_name__icontains=name)
            )
        if email:
            queryset = queryset.filter(email__icontains=email)
        if region:
            queryset = queryset.filter(region__icontains=region)
        if modality:
            queryset = queryset.filter(modality=modality)
        if recruitment_search:
            queryset = queryset.filter(
                applications__recruitment_search_id=recruitment_search
            ).distinct()

        return queryset


class ApplicationViewSet(viewsets.ModelViewSet):
    """Gestión de postulaciones y de su estado dentro del proceso."""

    serializer_class = ApplicationSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = Application.objects.select_related(
            "candidate", "recruitment_search"
        ).order_by("-applied_at")

        candidate = self.request.query_params.get("candidate")
        recruitment_search = self.request.query_params.get("search")
        status = self.request.query_params.get("status")

        if candidate:
            queryset = queryset.filter(candidate_id=candidate)
        if recruitment_search:
            queryset = queryset.filter(recruitment_search_id=recruitment_search)
        if status:
            queryset = queryset.filter(status=status)

        return queryset


@api_view(["GET"])
def dashboard(request):
    """Indicadores principales calculados a partir de los datos actuales."""

    return Response(
        {
            "active_searches": RecruitmentSearch.objects.filter(
                status=RecruitmentSearch.Status.ACTIVE
            ).count(),
            "in_process": RecruitmentSearch.objects.filter(
                status=RecruitmentSearch.Status.IN_PROCESS
            ).count(),
            "in_interview": RecruitmentSearch.objects.filter(
                status=RecruitmentSearch.Status.INTERVIEW
            ).count(),
            "total_candidates": Candidate.objects.count(),
        }
    )
