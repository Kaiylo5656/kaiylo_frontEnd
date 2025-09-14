import React from 'react';
import { Card, CardContent } from './ui/card';

const ReplyMessage = ({ replyTo, isOwnMessage = false, onReplyClick }) => {
  if (!replyTo) return null;

  const formatReplyContent = (reply) => {
    if (reply.message_type === 'file') {
      return `📎 ${reply.file_name || 'File'}`;
    }
    // Truncate long messages
    return reply.content.length > 100 
      ? `${reply.content.substring(0, 100)}...` 
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

  return (
    <div className={`reply-message ${isOwnMessage ? 'own-reply' : 'other-reply'}`}>
      <div className="reply-indicator">
        <div className="reply-line"></div>
        <div className="reply-icon">↩️</div>
      </div>
      <Card 
        className="reply-card cursor-pointer hover:shadow-md transition-shadow duration-200"
        onClick={() => onReplyClick && onReplyClick(replyTo.id)}
        title="Click to jump to original message"
      >
        <CardContent className="p-2">
          <div className="reply-content">
            <div className="reply-header">
              <span className="reply-label text-xs text-muted-foreground">
                Replying to
              </span>
              <span className="text-xs text-blue-500 ml-2">(click to jump)</span>
            </div>
            <div className="reply-text text-sm">
              {getFileIcon(replyTo.message_type)}
              {formatReplyContent(replyTo)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplyMessage;
