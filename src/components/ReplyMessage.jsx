import React from 'react';

// Custom Reply Icon Component
const ReplyIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 512 512"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M204.2 18.4c12 5 19.8 16.6 19.8 29.6l0 80 112 0c97.2 0 176 78.8 176 176 0 113.3-81.5 163.9-100.2 174.1-2.5 1.4-5.3 1.9-8.1 1.9-10.9 0-19.7-8.9-19.7-19.7 0-7.5 4.3-14.4 9.8-19.5 9.4-8.8 22.2-26.4 22.2-56.7 0-53-43-96-96-96l-96 0 0 80c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-160-160c-12.5-12.5-12.5-32.8 0-45.3l160-160c9.2-9.2 22.9-11.9 34.9-6.9z"/>
  </svg>
);

const ReplyMessage = ({ replyTo, isOwnMessage = false, onReplyClick }) => {
  if (!replyTo) return null;

  const formatReplyContent = (reply) => {
    if (reply.message_type === 'file') {
      return reply.file_name || 'Fichier';
    }
    // Truncate long messages
    return reply.content.length > 80 
      ? `${reply.content.substring(0, 80)}...` 
      : reply.content;
  };

  const getFileIcon = (messageType) => {
    switch (messageType) {
      case 'file':
        return '📎';
      default:
        return '';
    }
  };

  const getSenderName = () => {
    if (replyTo.sender?.name) return replyTo.sender.name;
    if (replyTo.sender?.email) return replyTo.sender.email;
    return 'Message';
  };

  return (
    <div 
      className="cursor-pointer group"
      onClick={() => onReplyClick && onReplyClick(replyTo.id)}
      title="Cliquer pour voir le message original"
    >
      <div 
        className="relative overflow-hidden transition-opacity duration-200 hover:opacity-90"
        style={{
          background: isOwnMessage 
            ? 'linear-gradient(90deg, rgba(212, 132, 90, 0.2) 0%, rgba(212, 132, 90, 0.15) 50%, rgba(212, 132, 90, 0.05) 100%)' 
            : 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 50%, transparent 100%)',
          padding: '8px 12px 8px 28px',
          borderRadius: '8px'
        }}
      >
        {/* Vertical line with spacing */}
        <div
          className="absolute left-2 top-2 bottom-2 transition-opacity duration-200"
          style={{
            width: '2px',
            backgroundColor: isOwnMessage ? 'var(--kaiylo-primary-hex)' : 'rgba(255, 255, 255, 0.3)',
            borderRadius: '5px'
          }}
        />
        {/* Header with icon and sender name */}
        <div className="flex items-center gap-2 mb-1.5">
          <ReplyIcon 
            className="w-3.5 h-3.5 flex-shrink-0" 
            style={{ 
              color: isOwnMessage ? 'var(--kaiylo-primary-hex)' : 'rgba(255, 255, 255, 0.6)',
              transform: 'scaleX(-1)'
            }} 
          />
          <span 
            className="text-xs font-medium truncate"
            style={{ 
              color: isOwnMessage ? 'var(--kaiylo-primary-hex)' : 'rgba(255, 255, 255, 0.7)'
            }}
          >
            {getSenderName()}
          </span>
        </div>
        
        {/* Reply content */}
        <div 
          className="text-sm leading-relaxed break-words"
          style={{ 
            color: isOwnMessage ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
            fontSize: '13px',
            lineHeight: '1.4'
          }}
        >
          {getFileIcon(replyTo.message_type)}
          {formatReplyContent(replyTo)}
        </div>
        
        {/* Hover indicator */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${isOwnMessage ? 'rgba(212, 132, 90, 0.1)' : 'rgba(255, 255, 255, 0.05)'} 0%, transparent 100%)`
          }}
        />
      </div>
    </div>
  );
};

export default ReplyMessage;
