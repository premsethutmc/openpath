# Written for Essay Intelligence v2 (Django 5.2); equivalent to `manage.py makemigrations evaluation`.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("evaluation", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="EssayEvaluationRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("task", models.CharField(max_length=12)),
                ("protocol", models.CharField(max_length=24)),
                ("adapter", models.CharField(max_length=16)),
                ("model", models.CharField(blank=True, max_length=80)),
                ("rubric", models.CharField(blank=True, max_length=60)),
                ("fingerprint", models.CharField(blank=True, max_length=40)),
                ("text_chars", models.PositiveIntegerField(default=0)),
                ("status", models.CharField(choices=[("answered", "Answered"), ("refused", "Refused"), ("failed", "Failed")], max_length=16)),
                ("reason", models.CharField(blank=True, max_length=200)),
                ("input_tokens", models.PositiveIntegerField(default=0)),
                ("output_tokens", models.PositiveIntegerField(default=0)),
                ("latency_ms", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="essay_evaluations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["created_at", "id"],
            },
        ),
    ]
