/** Match an actual learning task, not substrings such as получил or a generic prepare. */
export function isStudyTask(idea: string): boolean {
  return /\bnclex\b|\b(?:ege|sat|ielts|toefl|ged|gre|gmat|exams?|study|studying|learn|learning)\b|(?:^|[^а-яё])(?:егэ|огэ|экзам\S*|изуч\S*|обуч\S*|учиться|учить|учеб\S*|учёб\S*)(?=$|[^а-яё])|\b(?:estudiar|estudiando|examen|exámenes|aprender)\b/iu.test(idea);
}
