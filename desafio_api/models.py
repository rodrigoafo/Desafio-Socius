import uuid

from django.db import models


class RecruitmentSearch(models.Model):

    class Priority(models.TextChoices):
        HIGH = "HIGH", "Alta"
        MEDIUM = "MEDIUM", "Media"
        LOW = "LOW", "Baja"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Activa"
        IN_PROCESS = "IN_PROCESS", "En proceso"
        INTERVIEW = "INTERVIEW", "En entrevistas"
        CLOSED = "CLOSED", "Cerrada"

    position = models.CharField(max_length=150)

    practice = models.CharField(max_length=100)

    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    opening_date = models.DateField()

    requester = models.CharField(max_length=150)

    description = models.TextField(
        blank=True
    )

    public_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.position
    
class Candidate(models.Model):

    class Modality(models.TextChoices):
        ONSITE = "ONSITE", "Presencial"
        HYBRID = "HYBRID", "Híbrido"
        REMOTE = "REMOTE", "Remoto"

    first_name = models.CharField(
        max_length=100
    )

    last_name = models.CharField(
        max_length=100
    )

    email = models.EmailField(
        unique=True
    )

    phone = models.CharField(
        max_length=20,
        blank=True
    )

    experience_years = models.PositiveIntegerField(
        default=0
    )

    region = models.CharField(
        max_length=100
    )

    modality = models.CharField(
        max_length=20,
        choices=Modality.choices
    )

    linkedin = models.URLField(
        blank=True
    )

    cv_file = models.FileField(
        upload_to="cvs/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    

class Application(models.Model):

    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Postulado"
        REVIEW = "REVIEW", "En revisión"
        INTERVIEW = "INTERVIEW", "Entrevista"
        SELECTED = "SELECTED", "Seleccionado"
        REJECTED = "REJECTED", "Descartado"

    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="applications"
    )

    recruitment_search = models.ForeignKey(
        RecruitmentSearch,
        on_delete=models.CASCADE,
        related_name="applications"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.APPLIED
    )

    applied_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "candidate",
                    "recruitment_search"
                ],
                name="unique_candidate_search_application"
            )
        ]

    def __str__(self):
        return f"{self.candidate} - {self.recruitment_search}"