# Written for E3a (Django 5.2); equivalent to `manage.py makemigrations evaluation`.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("learners", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvaluationRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("protocol", models.CharField(max_length=24)),
                ("item_id", models.CharField(max_length=80)),
                ("item_version", models.PositiveIntegerField()),
                ("fingerprint", models.CharField(max_length=160)),
                (
                    "request",
                    models.JSONField(help_text="The request as forwarded, after identifier removal."),
                ),
                ("adapter", models.CharField(max_length=24)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("answered", "Answered"),
                            ("refused", "Refused"),
                            ("failed", "Failed"),
                        ],
                        max_length=16,
                    ),
                ),
                ("reason", models.CharField(blank=True, max_length=200)),
                (
                    "proposal",
                    models.JSONField(
                        blank=True,
                        help_text="Exactly what the adapter returned. Untrusted.",
                        null=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "learner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="evaluations",
                        to="learners.learner",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at", "id"],
            },
        ),
        migrations.CreateModel(
            name="PurposeConsent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "purpose",
                    models.CharField(
                        choices=[("ai_evaluation_of_writing", "AI evaluation of written answers")],
                        max_length=40,
                    ),
                ),
                ("granted", models.BooleanField()),
                (
                    "given_by",
                    models.CharField(
                        choices=[
                            ("guardian", "Parent or guardian"),
                            ("school", "School"),
                        ],
                        max_length=16,
                    ),
                ),
                ("policy_version", models.CharField(max_length=40)),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "learner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="purpose_consents",
                        to="learners.learner",
                    ),
                ),
            ],
            options={
                "ordering": ["recorded_at", "id"],
            },
        ),
    ]
