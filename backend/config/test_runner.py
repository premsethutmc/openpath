"""The test runner: the suite tests grading-policy@1 (OPENPATH_GRADING=unified) unless the environment names a mode explicitly; the
shadow and legacy modes have their own tests (family/test_grading_modes.py), which set the mode themselves."""
import os

from django.conf import settings
from django.test.runner import DiscoverRunner


class OpenPathTestRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        if "OPENPATH_GRADING" not in os.environ:
            settings.OPENPATH_GRADING = "unified"
