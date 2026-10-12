// Synthesise one line with eSpeak NG and write the audio plus phoneme timings.
//   say <voice> <rate> <pitch> <out.wav> <out.json> "text"
#include <espeak-ng/speak_lib.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static short *buf; static size_t n, cap; static FILE *js; static int first = 1;
static int cb(short *wav, int num, espeak_EVENT *ev) {
  if (wav && num > 0) { if (n + num > cap) { cap = (n + num) * 2; buf = realloc(buf, cap * sizeof(short)); } memcpy(buf + n, wav, num * sizeof(short)); n += num; }
  for (; ev && ev->type != espeakEVENT_LIST_TERMINATED; ev++) {
    if (ev->type == espeakEVENT_PHONEME) { char s[9] = {0}; memcpy(s, ev->id.string, 8); fprintf(js, "%s[%d,\"%s\"]", first ? "" : ",", ev->audio_position, s); first = 0; }
    if (ev->type == espeakEVENT_WORD) { fprintf(js, "%s[%d,\"#word\"]", first ? "" : ",", ev->audio_position); first = 0; }
  }
  return 0;
}
int main(int c, char **v) {
  if (c < 7) return 2;
  int rate = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, NULL, espeakINITIALIZE_PHONEME_EVENTS);
  espeak_SetSynthCallback(cb);
  if (espeak_SetVoiceByName(v[1]) != EE_OK) { fprintf(stderr, "no voice %s\n", v[1]); return 3; }
  espeak_SetParameter(espeakRATE, atoi(v[2]), 0); espeak_SetParameter(espeakPITCH, atoi(v[3]), 0); espeak_SetParameter(espeakRANGE, 70, 0);
  js = fopen(v[5], "w"); fprintf(js, "{\"rate\":%d,\"events\":[", rate);
  espeak_Synth(v[6], strlen(v[6]) + 1, 0, POS_CHARACTER, 0, espeakCHARS_UTF8 | espeakPHONEMES, NULL, NULL);
  espeak_Synchronize();
  fprintf(js, "],\"samples\":%zu}\n", n); fclose(js);
  FILE *f = fopen(v[4], "wb"); unsigned int sz = n * 2, r = rate, br = rate * 2, t;
  fwrite("RIFF", 1, 4, f); t = 36 + sz; fwrite(&t, 4, 1, f); fwrite("WAVEfmt ", 1, 8, f); t = 16; fwrite(&t, 4, 1, f);
  unsigned short fmt = 1, ch = 1, ba = 2, bits = 16; fwrite(&fmt, 2, 1, f); fwrite(&ch, 2, 1, f); fwrite(&r, 4, 1, f); fwrite(&br, 4, 1, f); fwrite(&ba, 2, 1, f); fwrite(&bits, 2, 1, f);
  fwrite("data", 1, 4, f); fwrite(&sz, 4, 1, f); fwrite(buf, 2, n, f); fclose(f);
  return 0;
}
