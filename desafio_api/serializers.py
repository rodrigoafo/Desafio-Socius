from rest_framework import serializers

from .models import Application, Candidate, RecruitmentSearch


class RecruitmentSearchSerializer(serializers.ModelSerializer):
    candidate_count = serializers.SerializerMethodField()

    class Meta:
        model = RecruitmentSearch
        fields = (
            "id",
            "position",
            "practice",
            "priority",
            "status",
            "opening_date",
            "requester",
            "description",
            "public_id",
            "candidate_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "candidate_count", "created_at", "updated_at")

    def get_candidate_count(self, recruitment_search):
        return recruitment_search.applications.count()


class CandidateSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "experience_years",
            "region",
            "modality",
            "linkedin",
            "cv_file",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "full_name", "created_at", "updated_at")
        extra_kwargs = {
            "email": {
                "error_messages": {
                    "unique": "Ya existe un candidato registrado con este correo."
                }
            }
        }

    def get_full_name(self, candidate):
        return f"{candidate.first_name} {candidate.last_name}"

    def validate_phone(self, phone):
        if phone and not phone.isdigit():
            raise serializers.ValidationError("El teléfono solo puede contener números.")
        return phone

    def validate_cv_file(self, cv_file):
        max_size = 5 * 1024 * 1024
        allowed_content_types = {"application/pdf", "application/x-pdf"}

        if not cv_file.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("El currículum debe estar en formato PDF.")

        if cv_file.content_type and cv_file.content_type not in allowed_content_types:
            raise serializers.ValidationError("El currículum debe estar en formato PDF.")

        if cv_file.size > max_size:
            raise serializers.ValidationError("El currículum no puede superar los 5 MB.")

        signature = cv_file.read(4)
        cv_file.seek(0)
        if signature != b"%PDF":
            raise serializers.ValidationError("El currículum debe ser un archivo PDF válido.")

        return cv_file


class ApplicationSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.EmailField(source="candidate.email", read_only=True)
    recruitment_search_position = serializers.CharField(
        source="recruitment_search.position", read_only=True
    )

    class Meta:
        model = Application
        validators = []
        fields = (
            "id",
            "candidate",
            "candidate_name",
            "candidate_email",
            "recruitment_search",
            "recruitment_search_position",
            "status",
            "applied_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "candidate_name",
            "candidate_email",
            "recruitment_search_position",
            "applied_at",
            "updated_at",
        )

    def get_candidate_name(self, application):
        return str(application.candidate)

    def validate(self, attributes):
        candidate = attributes.get("candidate", getattr(self.instance, "candidate", None))
        recruitment_search = attributes.get(
            "recruitment_search", getattr(self.instance, "recruitment_search", None)
        )

        if candidate and recruitment_search:
            existing_applications = Application.objects.filter(
                candidate=candidate,
                recruitment_search=recruitment_search,
            )
            if self.instance:
                existing_applications = existing_applications.exclude(pk=self.instance.pk)

            if existing_applications.exists():
                raise serializers.ValidationError(
                    {"detail": "El candidato ya se encuentra postulado a esta búsqueda."}
                )

        return attributes
