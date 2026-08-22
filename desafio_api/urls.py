from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    ApplicationViewSet,
    CandidateViewSet,
    RecruitmentSearchViewSet,
    dashboard,
)


router = DefaultRouter()
router.register("searches", RecruitmentSearchViewSet, basename="search")
router.register("candidates", CandidateViewSet, basename="candidate")
router.register("applications", ApplicationViewSet, basename="application")

urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
] + router.urls
