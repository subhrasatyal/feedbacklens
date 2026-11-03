import type { Framework } from '../../api/frameworks'

type Props = {
  framework: Framework
  answers: Record<string, string>
  onChange: (questionId: string, answer: string) => void
}

// "Before we start": the chosen framework's extra questions for the PM.
// Answers are shared by question, so switching framework keeps what's been typed.
function ApproachQuestions({ framework, answers, onChange }: Props) {
  if (framework.pm_inputs.length === 0) {
    return (
      <p className="muted">
        No extra questions: the problem and the specimen tray cover what {framework.name} needs.
      </p>
    )
  }

  return (
    <>
      {framework.pm_inputs.map((q) => (
        <label key={q.id} className="field">
          <span>
            {q.question} {!q.required && <span className="muted">(optional)</span>}
          </span>
          <textarea
            className="input"
            rows={2}
            required={q.required}
            value={answers[q.id] ?? ''}
            onChange={(e) => onChange(q.id, e.target.value)}
          />
          {q.help && <span className="muted">{q.help}</span>}
        </label>
      ))}
    </>
  )
}

export default ApproachQuestions
