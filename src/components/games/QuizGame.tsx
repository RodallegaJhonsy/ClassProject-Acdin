"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { fmt, resultMessage } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { QuizGameData } from "@/types/games";
import { ProgressBar, ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: QuizGameData;
}

export default function QuizGame({ data, theme, ui, onFinish, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = data.questions.length;
  const question = data.questions[index];
  const answered = selected !== null;
  const isLast = index === total - 1;

  const choose = (option: number) => {
    if (answered) return;
    setSelected(option);
    if (option === question.correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      onFinish(score, total);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={score}
        total={total}
        message={resultMessage(score, total)}
        onRestart={restart}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`text-sm font-medium ${theme.muted}`}>
          {fmt(ui.questionOf, { current: index + 1, total })}
        </span>
        <StatPill theme={theme} label={ui.score} value={score} />
      </div>
      <ProgressBar value={index + (answered ? 1 : 0)} max={total} theme={theme} label={ui.progress} />

      <div key={index} className="animate-fadeIn">
        <h3 className={`mt-6 text-xl sm:text-2xl ${theme.heading}`}>{question.q}</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {question.options.map((option, i) => {
            const isCorrect = i === question.correct;
            const isChosen = i === selected;
            let state = `${theme.card} ${theme.border} ${theme.cardHover}`;
            if (answered && isCorrect) state = theme.success;
            else if (answered && isChosen) state = theme.error;
            else if (answered) state = `${theme.card} ${theme.border} opacity-60`;
            return (
              <button
                key={option}
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                className={`flex min-h-[3.5rem] items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition disabled:cursor-default sm:text-base ${state}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{option}</span>
                {answered && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />}
                {answered && isChosen && !isCorrect && <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            role="status"
            className={`mt-5 animate-fadeIn rounded-xl border-l-4 border p-4 ${
              selected === question.correct ? theme.success : theme.error
            }`}
          >
            <p className="font-bold">{selected === question.correct ? ui.correct : ui.incorrect}</p>
            <p className="mt-1 text-sm">{question.explanation}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={next} disabled={!answered} className={`${btnBase} ${theme.primaryBtn} px-6`}>
            {isLast ? ui.seeResults : ui.next}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

