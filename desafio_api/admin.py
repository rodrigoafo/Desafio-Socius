from django.contrib import admin

from .models import Application, Candidate, RecruitmentSearch


@admin.register(RecruitmentSearch)
class RecruitmentSearchAdmin(admin.ModelAdmin):
    list_display = (
        "position",
        "practice",
        "priority",
        "status",
        "opening_date",
        "requester",
    )
    list_filter = ("priority", "status", "practice")
    search_fields = ("position", "practice", "requester")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "email",
        "experience_years",
        "region",
        "modality",
        "created_at",
    )
    list_filter = ("modality", "region")
    search_fields = ("first_name", "last_name", "email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("candidate", "recruitment_search", "status", "applied_at")
    list_filter = ("status",)
    search_fields = (
        "candidate__first_name",
        "candidate__last_name",
        "candidate__email",
        "recruitment_search__position",
    )
    readonly_fields = ("applied_at", "updated_at")
