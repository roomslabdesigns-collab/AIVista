import React, { useState, useMemo } from 'react';
import { AISearchResult, SearchQuery, WebsiteAnalysis } from '../types';
import { VistaIcon } from './VistaIcon';

interface AISearchDrawerContentProps {
  searchResults: AISearchResult[];
  queries: SearchQuery[];
  brandName: string;
  analysis?: WebsiteAnalysis | null;
  isEvaluating?: boolean;
  completedCount?: number;
  totalCount?: number;
}

export const AISearchDrawerContent: React.FC<AISearchDrawerContentProps> = ({
  searchResults,
  queries,
  brandName,
  analysis,
  isEvaluating,
  completedCount = 0,
  totalCount = 24
}) => {
  const [filter, setFilter] = useState<'all' | 'recommended' | 'mentioned' | 'not_mentioned' | 'grounded'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);

  // Map queries to results
  const combinedItems = useMemo(() => {
    const resultMap = new Map<string, AISearchResult>();
    for (const res of searchResults) {
      resultMap.set(res.queryId, res);
      // Also index by query string if queryId mismatch
      resultMap.set(res.query.toLowerCase().trim(), res);
    }

    return queries.map((q) => {
      const result = resultMap.get(q.id) || resultMap.get(q.query.toLowerCase().trim()) || null;
      return {
        query: q,
        result
      };
    });
  }, [searchResults, queries]);

  const stats = useMemo(() => {
    const total = searchResults.length;
    const mentioned = searchResults.filter((r) => r.brandMentioned).length;
    const recommended = searchResults.filter((r) => r.brandRecommended).length;
    const grounded = searchResults.filter((r) => r.isSearchGrounded).length;
    const ungrounded = total - grounded;

    return {
      total,
      mentioned,
      mentionRate: total > 0 ? Math.round((mentioned / total) * 100) : 0,
      recommended,
      recRate: total > 0 ? Math.round((recommended / total) * 100) : 0,
      grounded,
      ungrounded
    };
  }, [searchResults]);

  const filteredItems = useMemo(() => {
    return combinedItems.filter(({ query, result }) => {
      // Text filter
      if (searchFilter.trim()) {
        const text = searchFilter.toLowerCase();
        const matchesQuery = query.query.toLowerCase().includes(text);
        const matchesResponse = result?.responseText.toLowerCase().includes(text);
        const matchesContext = result?.recommendationContext?.toLowerCase().includes(text);
        if (!matchesQuery && !matchesResponse && !matchesContext) {
          return false;
        }
      }

      // Tab filter
      if (filter === 'recommended') {
        return result?.brandRecommended === true;
      }
      if (filter === 'mentioned') {
        return result?.brandMentioned === true;
      }
      if (filter === 'not_mentioned') {
        return result && !result.brandMentioned;
      }
      if (filter === 'grounded') {
        return result?.isSearchGrounded === true;
      }
      return true;
    });
  }, [combinedItems, filter, searchFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Live evaluation banner if in progress */}
      {isEvaluating && (
        <div
          id="banner-evaluating"
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '2px solid #0284c7',
              borderTopColor: 'transparent',
              display: 'inline-block',
              animation: 'spin 1s linear infinite'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 12.5px/1.3 Inter,sans-serif', color: '#0369a1' }}>
              AI Search Analysis in Progress ({completedCount}/{totalCount})
            </div>
            <div style={{ font: '400 11.5px/1.35 Inter,sans-serif', color: '#0284c7', marginTop: '2px' }}>
              Querying Gemini server-side to detect brand mentions, recommendations, and competitors.
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Metrics Header */}
      {stats.total > 0 && (
        <div
          id="search-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '11px'
          }}
        >
          <div>
            <div style={{ font: '500 10.5px/1 Inter,sans-serif', color: '#64748b' }}>Brand Mention Share</div>
            <div style={{ font: '700 17px/1.2 Inter,sans-serif', color: '#0f172a', marginTop: '4px' }}>
              {stats.mentionRate}%
              <span style={{ font: '400 11px/1 Inter,sans-serif', color: '#64748b', marginLeft: '5px' }}>
                ({stats.mentioned}/{stats.total})
              </span>
            </div>
          </div>
          <div>
            <div style={{ font: '500 10.5px/1 Inter,sans-serif', color: '#64748b' }}>Brand Recommended</div>
            <div style={{ font: '700 17px/1.2 Inter,sans-serif', color: stats.recommended > 0 ? '#10b981' : '#0f172a', marginTop: '4px' }}>
              {stats.recRate}%
              <span style={{ font: '400 11px/1 Inter,sans-serif', color: '#64748b', marginLeft: '5px' }}>
                ({stats.recommended}/{stats.total})
              </span>
            </div>
          </div>
          <div>
            <div style={{ font: '500 10.5px/1 Inter,sans-serif', color: '#64748b' }}>Grounding Mode</div>
            <div style={{ font: '600 13px/1.3 Inter,sans-serif', color: '#334155', marginTop: '4px' }}>
              {stats.grounded > 0 ? `${stats.grounded} Grounded` : 'Direct AI Response'}
              <span style={{ display: 'block', font: '400 10px/1 Inter,sans-serif', color: '#94a3b8', marginTop: '2px' }}>
                Unbiased model analysis
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input
          type="text"
          placeholder="Filter queries by keyword or competitor..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '12.5px',
            fontFamily: 'Inter, sans-serif',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            { id: 'all', label: `All (${combinedItems.length})` },
            { id: 'recommended', label: `Recommended (${stats.recommended})` },
            { id: 'mentioned', label: `Mentioned (${stats.mentioned})` },
            { id: 'not_mentioned', label: `Not Mentioned (${stats.total - stats.mentioned})` },
            ...(stats.grounded > 0 ? [{ id: 'grounded', label: `Grounded (${stats.grounded})` }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: filter === tab.id ? 600 : 500,
                color: filter === tab.id ? '#1d4ed8' : '#475569',
                background: filter === tab.id ? '#eff6ff' : '#fff',
                border: `1px solid ${filter === tab.id ? '#bfdbfe' : '#e2e8f0'}`,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queries & Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No queries match the selected filter.
          </div>
        ) : (
          filteredItems.map(({ query, result }, idx) => {
            const isExpanded = expandedQueryId === query.id;
            const intent = query.intent.replace(/_/g, ' ');

            return (
              <div
                key={query.id || idx}
                id={`ai-query-card-${query.id}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* Query Header: Badges & Provider Info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        color:
                          intent === 'high intent' || intent === 'intent to buy'
                            ? '#b91c1c'
                            : intent === 'comparison'
                            ? '#1d4ed8'
                            : '#475569',
                        background:
                          intent === 'high intent' || intent === 'intent to buy'
                            ? '#fef2f2'
                            : intent === 'comparison'
                            ? '#eff6ff'
                            : '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {intent}
                    </span>

                    {/* Brand Status Badge */}
                    {result ? (
                      result.brandRecommended ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: '#065f46',
                            background: '#d1fae5',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Recommended
                        </span>
                      ) : result.brandMentioned ? (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: '#1e40af',
                            background: '#dbeafe',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          Mentioned
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 500,
                            color: '#64748b',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '3px 7px',
                            borderRadius: '6px'
                          }}
                        >
                          Not Mentioned
                        </span>
                      )
                    ) : (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#94a3b8',
                          background: '#f1f5f9',
                          padding: '3px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        Queued for evaluation
                      </span>
                    )}
                  </div>

                  {/* Provider & Model Pill */}
                  {result && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 500,
                          color: '#475569',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '3px 8px',
                          borderRadius: '999px'
                        }}
                      >
                        Gemini · {result.model}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: result.isSearchGrounded ? '#0284c7' : '#64748b',
                          background: result.isSearchGrounded ? '#e0f2fe' : '#f1f5f9',
                          padding: '3px 7px',
                          borderRadius: '999px'
                        }}
                      >
                        {result.isSearchGrounded ? 'Search Grounded' : 'Model Response'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Query String */}
                <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                  “{query.query}”
                </div>

                {/* Recommendation Context */}
                {result?.recommendationContext && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#fbfcfe',
                      borderLeft: '3px solid #2563eb',
                      border: '1px solid #e2e8f0',
                      borderLeftWidth: '3px',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: '#334155'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.05em', color: '#2563eb', marginBottom: '3px' }}>
                      AI Recommendation Context
                    </div>
                    {result.recommendationContext}
                  </div>
                )}

                {/* Competitors Mentioned */}
                {result?.competitorsMentioned && result.competitorsMentioned.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8' }}>
                      Competitors Detected:
                    </span>
                    {result.competitorsMentioned.map((comp, cIdx) => (
                      <span
                        key={cIdx}
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          padding: '3px 8px',
                          borderRadius: '999px'
                        }}
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                )}

                {/* Citations (if search-grounded) */}
                {result?.citations && result.citations.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: '5px' }}>
                      Real Citations Returned by Search:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {result.citations.map((cite, cIdx) => (
                        <a
                          key={cIdx}
                          href={cite.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cite.title || cite.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collapsible Complete AI Response Accordion */}
                {result?.responseText && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedQueryId(isExpanded ? null : query.id)}
                      style={{
                        padding: 0,
                        background: 'none',
                        border: 0,
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      {isExpanded ? 'Hide complete AI response' : 'View complete AI response'}
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                          lineHeight: 1.6,
                          color: '#334155',
                          maxHeight: '360px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'Inter, system-ui, sans-serif'
                        }}
                      >
                        {result.responseText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
