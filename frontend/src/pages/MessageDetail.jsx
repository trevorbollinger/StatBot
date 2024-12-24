import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingIndicator from '../components/LoadingIndicator';
import '../styles/MessageDetail.css';

const MessageDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMessage();
    }, [id]);

    const fetchMessage = async () => {
        try {
            const response = await api.get(`/api/database/messages/${id}/`);
            setMessage(response.data);
        } catch (error) {
            console.error('Error fetching message:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const renderRoles = (roles) => {
        return (
            <div className="roles-container">
                {roles.sort((a, b) => b.position - a.position).map(role => (
                    <span
                        key={role.id}
                        className="role-badge"
                        style={{ backgroundColor: role.color !== '#000000' ? role.color : '#4A4A4A' }}
                    >
                        {role.name}
                    </span>
                ))}
            </div>
        );
    };

    const renderEmbed = (embed) => {
        if (embed.video) {
            return (
                <div className="embed-content">
                    <video 
                        controls 
                        src={embed.video.url}
                        width={embed.video.width}
                        height={embed.video.height}
                        style={{ maxWidth: '100%', height: 'auto' }}
                    >
                        {embed.thumbnail && 
                            <img 
                                src={embed.thumbnail.url} 
                                alt="Video thumbnail" 
                                width={embed.thumbnail.width}
                                height={embed.thumbnail.height}
                            />
                        }
                    </video>
                    {embed.title && <h4>{embed.title}</h4>}
                    {embed.description && <p>{embed.description}</p>}
                </div>
            );
        }

        if (embed.title || embed.description) {
            return (
                <div className="embed-content text-embed">
                    {embed.title && <h4 className="embed-title">{embed.title}</h4>}
                    {embed.description && <p className="embed-description">{embed.description}</p>}
                </div>
            );
        }

        return null;
    };

    if (loading) return <LoadingIndicator />;
    if (!message) return <div>Message not found</div>;

    const time = message ? formatDateTime(message.timestamp) : null;

    return (
        <div className="message-detail">
            <div className="info-container">
                <img src={message.guild.icon_url} alt="Server icon" className="server-icon" />
                <div className="info-details">
                    <h3>{message.guild.name}</h3>
                    <p>Server ID: {message.guild.id}</p>
                </div>
            </div>

            <div className="info-container">
                <div className="info-details">
                    <h3>#{message.channel.name}</h3>
                    <p>Channel ID: {message.channel.id}</p>
                    <p>Category: {message.channel.category_name}</p>
                    <p>Type: {message.channel.type}</p>
                </div>
            </div>

            <div className="info-container">
                <img src={message.author.avatar_url} alt="Author avatar" className="avatar-image" />
                <div className="info-details">
                    <h3>{message.author.nickname || message.author.name}</h3>
                    <p>User ID: {message.author.id}</p>
                    {message.author.roles && renderRoles(message.author.roles)}
                </div>
            </div>

            <div className="info-container">
                <div className="info-details">
                    <div className="message-metadata">
                        <span className="metadata-item">Message ID: {message.id}</span>
                        <span className="metadata-item"> Type: {message.type}</span>
                        {message.is_pinned && <span className="metadata-item">📌 Pinned</span>}
                    </div>

                    <div className="content">
                        <p>{message.content}</p>
                    </div>
                    {message.attachments.length > 0 && (
                                    <div className="">
                                        {message.attachments.map((attachment, index) => (
                                            <div key={index} className="attachment">
                                                {attachment.url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                                                    <img 
                                                        src={attachment.url} 
                                                        alt={attachment.fileName}
                                                        style={{ maxWidth: '100%', height: 'auto' }}
                                                    />
                                                ) : (
                                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                                        {attachment.fileName}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                    <div className="timestamp-info">
                        <p>Sent: {formatDateTime(message.timestamp)}</p>
                        {message.timestamp_edited && (
                            <p>Edited: {formatDateTime(message.timestamp_edited)}</p>
                        )}
                        {message.call_ended && (
                            <p>Call Ended: {formatDateTime(message.call_ended)}</p>
                        )}
                    </div>

                    {message.reference_message && (
                        <div className="reference-info">
                            <h4>Referenced Message</h4>
                            <div className="referenced-message">
                                <p><strong>{message.reference_message.author}:</strong> {message.reference_message.content}</p>
                                <span className="message-id">ID: {message.reference_message.id}</span>
                            </div>
                        </div>
                    )}

                    {Object.keys(message.reactions).length > 0 && (
                        <div className="reactions">
                            <h4>Reactions</h4>
                            {Object.entries(message.reactions).map(([reactionId, reaction]) => (
                                <span key={reactionId} className="reaction">
                                    {reaction.is_animated ? (
                                        <img src={reaction.image_url} alt={reaction.name} className="reaction-emoji" />
                                    ) : reaction.code || reaction.name}
                                    {reaction.count}
                                </span>
                            ))}
                        </div>
                    )}

                    {(message.attachments.length > 0 || message.embeds.length > 0 ||
                        message.stickers.length > 0 || message.mentions.length > 0 ||
                        message.inline_emojis.length > 0) && (
                            <div className="additional-content">
      
                                {message.stickers.length > 0 && (
                                    <div className="stickers">
                                        <h4>Stickers ({message.stickers.length})</h4>
                                    </div>
                                )}
                            </div>
                        )}
                </div>
            </div>
            {message.embeds && message.embeds.length > 0 && (
                <div className="info-container">
                    <div className="info-details">
                        <h4>Embeds ({message.embeds.length})</h4>
                        <div className="embeds-container">
                            {message.embeds.map((embed, index) => (
                                <div key={index} className="embed">
                                    {renderEmbed(embed)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {message.mentions && message.mentions.length > 0 && (
                <div className="info-container">
                    <div className="mentions-container">
                        <h3 className="mentions-header">Mentions</h3>
                        {message.mentions.map(mention => (
                            <div key={mention.id} className="mentioned-user">
                                <img src={mention.avatarUrl} alt={mention.name} className="avatar-image" />
                                <div className="info-details">
                                    <h3>{mention.nickname || mention.name}</h3>
                                    {mention.roles && renderRoles(mention.roles)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageDetail;