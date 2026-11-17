"""Shared server AI boundary regressions. All texts/keys are invented; transports never use a network."""
import json
from unittest import mock
from django.test import override_settings
from django.conf import settings
from evaluation.models import AIUsageBucket
from rest_framework.test import APIClient
from family.test_developer import DevTestCase
from family import word_problem
from evaluation import essay, llm
from evaluation.test_essay import observe_request, MODEL_OUTPUT, anthropic_reply
from family.test_word_problem import reply

KEY = 'synthetic-shared-secret-never-real'
SHARED = dict(OPENPATH_AI_SHARED_CONFIG='on', OPENPATH_AI_PROVIDER='anthropic',
 OPENPATH_AI_MODEL='synthetic-model', OPENPATH_AI_BASE_URL='https://llm.example.test',
 OPENPATH_AI_API_KEY=KEY, OPENPATH_AI_DAILY_REQUESTS=10, OPENPATH_AI_USER_DAILY_REQUESTS=5,
 OPENPATH_ESSAY_EVALUATOR='llm', OPENPATH_WORD_PROBLEMS='on',
 OPENPATH_LLM_API_KEY='', OPENPATH_WORD_PROBLEM_API_KEY='',
 OPENPATH_ESSAY_DAILY_REQUESTS=20, OPENPATH_WORD_PROBLEM_DAILY=20, OPENPATH_WORD_PROBLEM_SITE_DAILY=30)
EURL='/api/evaluation/essays/'
MURL='/api/solver/read/'

@override_settings(**SHARED)
class SharedGatewaySecurityTests(DevTestCase):
 def setUp(self):
  super().setUp()
  self.essay_transport=anthropic_reply(json.dumps(MODEL_OUTPUT))
  self.math_transport=reply({'calculation':'5 - 2','reading':'Subtract two.','unit':'apples'})
  self.enterContext(mock.patch.object(essay,'TRANSPORT',self.essay_transport))
  self.enterContext(mock.patch.object(word_problem.WordProblemView,'transport',staticmethod(self.math_transport)))
 def test_anonymous_and_ordinary_account_cannot_use_essay(self):
  for client in (APIClient(),self.parent('ordinary@example.org')):
   self.assertIn(client.post(EURL,observe_request(),format='json').status_code,(401,403))
  self.assertIn(APIClient().post(MURL,{'text':'Five apples less two?'},format='json').status_code,(401,403))
  self.assertEqual(self.essay_transport.calls,[]);self.assertEqual(self.math_transport.seen,[])
 def test_session_csrf_enforced_before_shared_gateway(self):
  dev=self.developer(); client=APIClient(enforce_csrf_checks=True);client.cookies=dev.cookies
  for url,body in [(EURL,observe_request()),(MURL,{'text':'Five apples less two?'})]:
   response=client.post(url,body,format='json')
   self.assertEqual(response.status_code,403);self.assertIn('CSRF',response.json()['detail'])
  self.assertEqual(self.essay_transport.calls,[]);self.assertEqual(self.math_transport.seen,[])
 def test_shared_credentials_are_transport_only_and_both_features_work(self):
  dev=self.developer()
  for url,body in [(EURL,observe_request()),(MURL,{'text':'Five apples less two?'})]:
   response=dev.post(url,body,format='json');self.assertEqual(response.status_code,200,response.content)
   self.assertNotIn(KEY,response.content.decode())
  for url in (EURL+'status/',MURL):
   response=dev.get(url);self.assertNotIn(KEY,response.content.decode())
  for calls in (self.essay_transport.calls,self.math_transport.seen):
   self.assertEqual(calls[0][1]['x-api-key'],KEY)
   self.assertNotIn(KEY,json.dumps(calls[0][2]))
   self.assertNotIn('founder@example.org',json.dumps(calls[0][2]))
 def test_invalid_input_never_reaches_transport(self):
  dev=self.developer()
  for body in ({'task':'invented','request':{},'data_use':'synthetic_test'}, {**observe_request(),'data_use':'real_learner'}):
   self.assertIn(dev.post(EURL,body,format='json').status_code,(400,403))
  for body in ({'text':''},{'text':123},{'text':'x'*601}):
   self.assertEqual(dev.post(MURL,body,format='json').status_code,400)
  self.assertEqual(self.essay_transport.calls,[]);self.assertEqual(self.math_transport.seen,[])
 @override_settings(OPENPATH_AI_USER_DAILY_REQUESTS=1)
 def test_per_account_cap_is_shared_across_subjects(self):
  dev=self.developer()
  self.assertEqual(dev.post(EURL,observe_request(),format='json').status_code,200)
  self.assertEqual(settings.OPENPATH_AI_USER_DAILY_REQUESTS,1)
  self.assertEqual(AIUsageBucket.objects.get(scope='global').requests,1)
  blocked=dev.post(MURL,{'text':'Five apples less two?'},format='json')
  self.assertIn(blocked.status_code,(429,503));self.assertEqual(self.math_transport.seen,[])
  other=self.parent('second@example.org')
  self.assertEqual(other.post(MURL,{'text':'Five apples less two?'},format='json').status_code,200)
 @override_settings(OPENPATH_AI_DAILY_REQUESTS=1)
 def test_global_cap_includes_failed_dispatch_and_other_accounts(self):
  def broken(*args): raise RuntimeError(KEY+' provider echoed invented essay')
  with mock.patch.object(essay,'TRANSPORT',broken):
   response=self.developer().post(EURL,observe_request(),format='json')
   self.assertIn(response.status_code,(502,503));self.assertNotIn(KEY,response.content.decode())
   self.assertNotIn('provider echoed',response.content.decode())
  response=self.parent('second@example.org').post(MURL,{'text':'Five apples less two?'},format='json')
  self.assertIn(response.status_code,(429,503));self.assertEqual(self.math_transport.seen,[])
 @override_settings(OPENPATH_AI_SHARED_CONFIG='off',OPENPATH_LLM_API_KEY='',OPENPATH_WORD_PROBLEM_API_KEY='')
 def test_shared_secret_does_not_enable_legacy_features(self):
  dev=self.developer()
  self.assertEqual(dev.post(EURL,observe_request(),format='json').status_code,503)
  self.assertEqual(dev.post(MURL,{'text':'Five apples less two?'},format='json').status_code,503)
  self.assertEqual(self.essay_transport.calls,[]);self.assertEqual(self.math_transport.seen,[])

@override_settings(**SHARED)
class SharedReservationTests(DevTestCase):
 def test_rollback_when_subject_bucket_exhausted_and_no_partial_charge(self):
  from evaluation import gateway
  with override_settings(OPENPATH_WORD_PROBLEM_DAILY=1):
   gateway.reserve('maths.word_problem',1)
   before=dict(AIUsageBucket.objects.values_list('scope','requests'))
   with self.assertRaises(gateway.GatewayDenied): gateway.reserve('maths.word_problem',1)
   self.assertEqual(dict(AIUsageBucket.objects.values_list('scope','requests')),before)
 def test_invalid_dispatch_never_reserves_or_calls_provider(self):
  from evaluation import gateway
  transport=mock.Mock(side_effect=AssertionError('Network forbidden'))
  for task,req,user in [('unknown',{},1),('maths.word_problem',{'text':'x','prompt':'injected'},1),('maths.word_problem',{'text':'x'},None),('maths.word_problem',{'text':'x'},True)]:
   with self.assertRaises(gateway.GatewayDenied): gateway.execute(task,req,user,transport=transport)
  transport.assert_not_called();self.assertEqual(AIUsageBucket.objects.count(),0)
 def test_invalid_shared_mode_and_database_failure_fail_closed(self):
  from evaluation import gateway
  from django.db import DatabaseError
  transport=mock.Mock(side_effect=AssertionError('Network forbidden'))
  with override_settings(OPENPATH_AI_SHARED_CONFIG='typo'):
   with self.assertRaises(gateway.GatewayDenied): gateway.execute('maths.word_problem',{'text':'Five less two?'},1,transport=transport)
  with mock.patch.object(AIUsageBucket.objects,'get_or_create',side_effect=DatabaseError(KEY)):
   with self.assertRaises(gateway.GatewayDenied) as caught: gateway.execute('maths.word_problem',{'text':'Five less two?'},1,transport=transport)
  self.assertNotIn(KEY,str(caught.exception))
  transport.assert_not_called();self.assertEqual(AIUsageBucket.objects.count(),0)
 def test_invalid_caps_fail_closed(self):
  from evaluation import gateway
  for cap in (0,-1,True,'20'):
   with override_settings(OPENPATH_AI_DAILY_REQUESTS=cap):
    with self.assertRaises(gateway.GatewayDenied): gateway.reserve('maths.word_problem',1)
  self.assertEqual(AIUsageBucket.objects.count(),0)

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import close_old_connections
from django.test import TransactionTestCase

@override_settings(**{**SHARED,'OPENPATH_AI_DAILY_REQUESTS':1})
class SharedAtomicRaceTests(TransactionTestCase):
 def test_parallel_cross_subject_reservations_never_exceed_global_cap(self):
  from evaluation import gateway
  from django.utils import timezone
  AIUsageBucket.objects.create(day=timezone.localdate(),scope='global',requests=0)
  ready=Barrier(2)
  def reserve(task,user):
   close_old_connections()
   try:
    ready.wait(timeout=5)
    try: gateway.reserve(task,user);return 'reserved'
    except gateway.GatewayDenied: return 'denied'
   finally: close_old_connections()
  with ThreadPoolExecutor(max_workers=2) as pool:
   first=pool.submit(reserve,'essay.observe',1)
   second=pool.submit(reserve,'maths.word_problem',2)
   outcomes=[first.result(timeout=10),second.result(timeout=10)]
  # SQLite may fail both writers closed; PostgreSQL serializes them. Neither may overshoot.
  self.assertLessEqual(outcomes.count('reserved'),1)
  self.assertEqual(AIUsageBucket.objects.get(scope='global').requests,outcomes.count('reserved'))
