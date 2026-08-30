from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from urllib.parse import urlsplit

from .models import Application, Candidate


@override_settings(ALLOWED_HOSTS=["testserver", "localhost"])
class RecruitmentApiTests(APITestCase):
    fixtures = ["demo_data.json"]

    def setUp(self):
        self.client.defaults["HTTP_HOST"] = "localhost"

    def test_searches_can_be_filtered_created_and_updated(self):
        response = self.client.get(
            "/api/searches/",
            {"position": "backend", "priority": "HIGH", "status": "ACTIVE"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["candidate_count"], 2)

        create_response = self.client.post(
            "/api/searches/",
            {
                "position": "QA Automation",
                "practice": "Testing",
                "priority": "MEDIUM",
                "status": "ACTIVE",
                "opening_date": "2026-08-21",
                "requester": "Equipo QA",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        update_response = self.client.patch(
            f"/api/searches/{create_response.data['id']}/",
            {"status": "IN_PROCESS"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], "IN_PROCESS")

    def test_candidates_support_cv_upload_filters_and_invalid_files(self):
        cv_file = SimpleUploadedFile(
            "cv-prueba.pdf", b"%PDF-1.4\narchivo de prueba", content_type="application/pdf"
        )
        create_response = self.client.post(
            "/api/candidates/",
            {
                "first_name": "Lucía",
                "last_name": "Prueba",
                "email": "lucia.prueba@example.com",
                "experience_years": 4,
                "region": "Metropolitana",
                "modality": "HYBRID",
                "cv_file": cv_file,
            },
            format="multipart",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["full_name"], "Lucía Prueba")
        self.assertTrue(create_response.data["cv_file"])

        cv_path = urlsplit(create_response.data["cv_file"]).path
        candidate = Candidate.objects.get(pk=create_response.data["id"])
        self.assertEqual(candidate.cv_file.url, cv_path)
        self.assertTrue(candidate.cv_file.storage.exists(candidate.cv_file.name))
        candidate.cv_file.delete(save=False)

        filter_response = self.client.get("/api/candidates/", {"search": 1})
        self.assertEqual(filter_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_response.data), 2)

        status_filter_response = self.client.get(
            "/api/candidates/", {"status": "INTERVIEW"}
        )
        self.assertEqual(status_filter_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(status_filter_response.data), 1)
        self.assertEqual(status_filter_response.data[0]["full_name"], "Diego Silva")

        invalid_cv = SimpleUploadedFile(
            "cv-invalido.pdf", b"esto no es un PDF", content_type="application/pdf"
        )
        invalid_response = self.client.post(
            "/api/candidates/",
            {
                "first_name": "Error",
                "last_name": "CV",
                "email": "error.cv@example.com",
                "experience_years": 1,
                "region": "Metropolitana",
                "modality": "REMOTE",
                "cv_file": invalid_cv,
            },
            format="multipart",
        )

        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cv_file", invalid_response.data)

    def test_applications_change_status_and_reject_duplicates(self):
        create_response = self.client.post(
            "/api/applications/",
            {"candidate": 1, "recruitment_search": 2, "status": "APPLIED"},
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        application_id = create_response.data["id"]

        update_response = self.client.patch(
            f"/api/applications/{application_id}/",
            {"status": "SELECTED"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], "SELECTED")

        duplicate_response = self.client.post(
            "/api/applications/",
            {"candidate": 1, "recruitment_search": 2, "status": "APPLIED"},
            format="json",
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            str(duplicate_response.data["detail"][0]),
            "El candidato ya se encuentra postulado a esta búsqueda.",
        )

    def test_dashboard_returns_calculated_indicators(self):
        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "active_searches": 1,
                "in_process": 1,
                "in_interview": 1,
                "total_candidates": 3,
            },
        )

    def test_application_filters(self):
        response = self.client.get(
            "/api/applications/",
            {"candidate": 1, "search": 1, "status": "REVIEW"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["candidate_name"], "María González")
