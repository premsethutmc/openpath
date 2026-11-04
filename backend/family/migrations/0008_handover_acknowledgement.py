# handover@1 (Workstream H1): an educator's acknowledgement of a paused competency (append-only)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("family", "0007_decision_record_uniqueness"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="HandoverAcknowledgement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("competency", models.CharField(max_length=120)),
                ("note", models.TextField(blank=True, default="", max_length=1000)),
                ("at", models.DateTimeField(auto_now_add=True)),
                ("educator", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("pupil", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="handover_acknowledgements", to="family.pupil")),
            ],
            options={"ordering": ["at", "id"]},
        ),
    ]
