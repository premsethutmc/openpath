from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('evaluation', '0002_essayevaluationrecord')]
    operations = [migrations.CreateModel(
        name='AIUsageBucket',
        fields=[('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day', models.DateField()), ('scope', models.CharField(max_length=100)),
                ('requests', models.PositiveIntegerField(default=0))],
        options={'constraints': [models.UniqueConstraint(fields=('day', 'scope'), name='ai_usage_day_scope_unique')]},
    )]
