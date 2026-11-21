# Tamil joins the subjects a learner's record is kept for (icse-tamil@2).

from django.db import migrations, models

SUBJECTS = [("english", "English"), ("mathematics", "Mathematics"), ("tamil", "Tamil")]


class Migration(migrations.Migration):

    dependencies = [
        ("family", "0016_writing_feedback"),
    ]

    operations = [
        migrations.AlterField(model_name="pupilevent", name="subject", field=models.CharField(choices=SUBJECTS, max_length=24)),
        migrations.AlterField(model_name="gradingdecisionrecord", name="subject", field=models.CharField(choices=SUBJECTS, max_length=24)),
    ]
