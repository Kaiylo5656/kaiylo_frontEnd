import React from "react";

/**
 * ExerciseCard component
 * Props:
 * - title: string (exercise name)
 * - instructions: string (how to perform the exercise)
 * - tags: array of strings (e.g., ["chest", "bodyweight"])
 * - demoVideoURL: string (optional, link to demo video)
 */
const ExerciseCard = ({ title, instructions, tags, demoVideoURL }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {instructions && (
        <p className="text-gray-700 mb-2">{instructions}</p>
      )}
      {tags && tags.length > 0 && (
        <div className="mb-2">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {demoVideoURL && (
        <a
          href={demoVideoURL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Watch Demo Video
        </a>
      )}
    </div>
  );
};

export default ExerciseCard;
