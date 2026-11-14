import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("family", "0012_word_problem_use"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Feedback",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("where", models.CharField(max_length=160)),
                ("kinds", models.CharField(max_length=80)),
                ("note", models.CharField(blank=True, max_length=300)),
                ("app_version", models.CharField(blank=True, max_length=40)),
                ("width", models.PositiveIntegerField(blank=True, null=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
