"""Actual Node→Python authority inside an owned, opt-in immutable Django decision."""
from unittest import mock
from django.test import override_settings
from .test_learning import LearningBase

@override_settings(OPENPATH_GRADING='shadow')
class GeometryWorkingTests(LearningBase):
    def opt_in(self):
        self.assertEqual(self.save(self.enrol()).status_code,201)
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target='MATH.geometry.triangle-properties',active=True)).status_code,201)

    def answer(self, working, response='118', **extra):
        return self.rec('attempt',questionId='gen:ahtri:36,26',response=response,activity='diagnostic',hints=0,solution=False,competency='MATH.geometry.triangle-properties',working=working,**extra)

    def test_saved_method_answer_separation_and_reload(self):
        self.opt_in()
        for working,response,status,verdict in [(['x = 118 (triangle sum)'],'118','verified','correct'),(['x = 128 (triangle sum)'],'118','invalid','correct'),(['x = 118 (triangle sum)'],'119','verified','incorrect'),(['x = 118'],'118','answer-only','correct'),(['A diagram makes it clear'],'118','unsupported','correct')]:
            event=self.answer(working,response)
            saved=self.save(event);self.assertEqual(saved.status_code,201,saved.data)
            d=self.records()[-1]['decision'];self.assertEqual(d['working']['status'],status,d)
            self.assertEqual(d['verdict'],verdict);self.assertEqual(d['workingPolicy'],'geometry-working@1')
            self.assertEqual(d['response']['working'],working);self.assertEqual(d['attemptId'],event['id'])
            self.assertEqual(d['working']['provenance']['questionId'],event['questionId'])
            self.assertEqual(d['working']['provenance']['checker'],'geometry-reasoner')
            self.assertEqual(d['working']['provenance']['version'],'geometry-reasoner@foundation-1')
        before=self.records()
        loaded=self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()
        self.assertEqual(loaded['events'],before)
        self.assertEqual(self.records(),before)

    def test_client_cannot_attach_authority_or_change_task(self):
        self.opt_in();before=len(self.records())
        for field,value in [('decision',{'decidedBy':'server','working':{'status':'verified'}}),('geometry',{'domain':'geometry','facts':[]}),('workingPolicy','geometry-working@1')]:
            self.assertEqual(self.save(self.answer(['x = 118'],**{field:value})).status_code,400)
        self.assertEqual(len(self.records()),before)

    def test_source_drift_falls_back_without_losing_answer_or_working(self):
        self.opt_in()
        with mock.patch('family.kernel_grader.geometry_intact',return_value=False):
            self.assertEqual(self.save(self.answer(['x = 118 (triangle sum)'])).status_code,201)
        d=self.records()[-1]['decision'];self.assertEqual(d['verdict'],'correct')
        self.assertEqual(d['working']['status'],'unsupported');self.assertIsNone(d['working']['firstInvalid'])

    def test_outer_timeout_kills_private_worker_process_group(self):
        from . import kernel_grader as kg
        import os, signal, subprocess
        if os.name != 'posix': self.skipTest('private process groups are POSIX')
        child=mock.MagicMock(); child.pid=987654; child.communicate.side_effect=[subprocess.TimeoutExpired('node',.5),('', '')]
        child.__enter__.return_value=child
        with mock.patch.object(kg,'enabled',return_value=True),mock.patch.object(kg.subprocess,'Popen',return_value=child) as start,mock.patch.object(kg.os,'killpg') as kill:
            self.assertIsNone(kg.run([{'id':'gen:ahtri:36,26','response':'118'}]))
        self.assertTrue(start.call_args.kwargs['start_new_session']);kill.assert_called_once_with(987654,signal.SIGKILL)
        self.assertEqual(child.communicate.call_count,2)
