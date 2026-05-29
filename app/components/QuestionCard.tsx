type Props = {
  questionNumber: number;
  totalQuestions: number;
  question: string;
  loading?: boolean;
  topic?: string;
};

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  loading,
  topic,
}: Props) {
  return (
    <div className="border border-gray-700 rounded-xl p-6 bg-gray-900">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 uppercase tracking-wide">
            Question {questionNumber} of {totalQuestions}
          </p>
          {topic && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-700 text-blue-300">
              {topic}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < questionNumber ? "bg-blue-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
      {loading ? (
        <p className="text-gray-400 italic">Q is thinking...</p>
      ) : (
        <p className="text-lg leading-relaxed whitespace-pre-wrap">{question}</p>
      )}
    </div>
  );
}
