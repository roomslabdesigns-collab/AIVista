import React, { useState } from 'react';
import { Project, AnalysisRun } from '../types';
import { createProjectApi, createAnalysisRunApi } from '../lib/projectApiClient';
import { VistaIcon } from './VistaIcon';

interface NewAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project, run: AnalysisRun) => void;
}

export function NewAnalysisModal({ isOpen, onClose, onSuccess }: NewAnalysisModalProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('SaaS / CRM');
  const [targetAudience, setTargetAudience] = useState('Mid-market RevOps & Sales Directors');
  const [targetMarket, setTargetMarket] = useState('North America & Europe');
  const [competitorsText, setCompetitorsText] = useState('HubSpot, Salesforce, Pipedrive, Zoho');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    const trimmedUrl = websiteUrl.trim();
    const trimmedName = companyName.trim();

    if (!trimmedUrl) {
      setError('Please enter a website URL for the brand.');
      return;
    }
    if (!trimmedName) {
      setError('Please enter the company or brand name.');
      return;
    }

    try {
      setLoading(true);
      const competitors = competitorsText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      // Step 1: Create Project in Firestore
      const project = await createProjectApi({
        websiteUrl: trimmedUrl,
        companyName: trimmedName,
        industry: industry.trim(),
        targetAudience: targetAudience.trim(),
        targetMarket: targetMarket.trim(),
        competitors,
        status: 'active'
      });

      // Step 2: Create Analysis Run for this project in Firestore
      const run = await createAnalysisRunApi(project.id);

      setLoading(false);
      onSuccess(project, run);
      onClose();
    } catch (err: any) {
      console.error('[NewAnalysis] Error creating analysis run:', err);
      setError(err.message || 'Failed to start analysis run. Please try again.');
      setLoading(false);
    }
  };

  const handlePreloadDefaults = () => {
    setWebsiteUrl('https://relay.io');
    setCompanyName('Relay CRM');
    setIndustry('SaaS / CRM');
    setTargetAudience('Mid-market RevOps & Sales Directors');
    setTargetMarket('North America & Europe');
    setCompetitorsText('HubSpot, Salesforce, Pipedrive, Zoho');
    setError(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 21, 51, 0.45)',
        backdropFilter: 'blur(3px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        id="modal-new-analysis"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(10, 21, 51, 0.2)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#eff4fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d5cf0'
              }}
            >
              <VistaIcon name="spark" color="#1d5cf0" size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  font: '700 17px/1.2 Inter, sans-serif',
                  letterSpacing: '-0.02em',
                  color: '#0f172a'
                }}
              >
                Launch New Analysis
              </h2>
              <p
                style={{
                  margin: '3px 0 0',
                  font: '400 12.5px/1.4 Inter, sans-serif',
                  color: '#64748b'
                }}
              >
                Configure target domain and create an active investigation run.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-new-analysis"
            onClick={onClose}
            disabled={loading}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              font: '400 16px/1 Inter, sans-serif'
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                id="modal-error-alert"
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  font: '500 12.5px/1.4 Inter, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Preload sample button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '600 11px/1 Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                Project Configuration
              </span>
              <button
                type="button"
                onClick={handlePreloadDefaults}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#1d5cf0',
                  font: '500 12px/1 Inter, sans-serif',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '6px'
                }}
              >
                Fill with Relay CRM sample
              </button>
            </div>

            {/* Field: Website URL */}
            <div>
              <label
                htmlFor="input-website-url"
                style={{ display: 'block', font: '600 13px/1 Inter, sans-serif', color: '#0f172a', marginBottom: '6px' }}
              >
                Website URL <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="input-website-url"
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="e.g. https://relay.io or mycompany.com"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid #d1d5db',
                  font: '400 13.5px/1.4 Inter, sans-serif',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Field: Company Name */}
            <div>
              <label
                htmlFor="input-company-name"
                style={{ display: 'block', font: '600 13px/1 Inter, sans-serif', color: '#0f172a', marginBottom: '6px' }}
              >
                Company / Brand Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="input-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Relay CRM"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid #d1d5db',
                  font: '400 13.5px/1.4 Inter, sans-serif',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Field: Industry & Target Market (2 cols) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="input-industry"
                  style={{ display: 'block', font: '600 13px/1 Inter, sans-serif', color: '#0f172a', marginBottom: '6px' }}
                >
                  Industry
                </label>
                <input
                  id="input-industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. B2B SaaS / CRM"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    borderRadius: '9px',
                    border: '1px solid #d1d5db',
                    font: '400 13.5px/1.4 Inter, sans-serif',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="input-target-market"
                  style={{ display: 'block', font: '600 13px/1 Inter, sans-serif', color: '#0f172a', marginBottom: '6px' }}
                >
                  Target Market
                </label>
                <input
                  id="input-target-market"
                  type="text"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  placeholder="e.g. North America"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    borderRadius: '9px',
                    border: '1px solid #d1d5db',
                    font: '400 13.5px/1.4 Inter, sans-serif',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Field: Target Audience */}
            <div>
              <label
                htmlFor="input-target-audience"
                style={{ display: 'block', font: '600 13px/1 Inter, sans-serif', color: '#0f172a', marginBottom: '6px' }}
              >
                Target Audience (ICP)
              </label>
              <input
                id="input-target-audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Mid-market RevOps & Sales Directors"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid #d1d5db',
                  font: '400 13.5px/1.4 Inter, sans-serif',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Field: Competitors */}
            <div>
              <label
                htmlFor="input-competitors"
                style={{ display: 'block', font: '600 13px/1 Inter, sans-serif', color: '#0f172a', marginBottom: '6px' }}
              >
                Competitors (comma separated)
              </label>
              <input
                id="input-competitors"
                type="text"
                value={competitorsText}
                onChange={(e) => setCompetitorsText(e.target.value)}
                placeholder="e.g. HubSpot, Salesforce, Pipedrive"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid #d1d5db',
                  font: '400 13.5px/1.4 Inter, sans-serif',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #edf2f7',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#f8fafc'
            }}
          >
            <button
              type="button"
              id="btn-cancel-analysis"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 16px',
                borderRadius: '9px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
                font: '600 13px/1 Inter, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-submit-analysis"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '9px',
                border: 0,
                background: loading ? '#93c5fd' : '#1d5cf0',
                color: '#fff',
                font: '600 13px/1 Inter, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(29, 92, 240, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  Saving & Initializing…
                </>
              ) : (
                <>
                  <VistaIcon name="spark" color="#fff" size={14} />
                  Start Investigation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
