from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("family", "0013_feedback"),
    ]

    operations = [
        migrations.CreateModel(
            name="EducatorRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("decision", models.CharField(blank=True, default="", max_length=10)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="educator_requests", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["requested_at", "id"]},
        ),
    ]
