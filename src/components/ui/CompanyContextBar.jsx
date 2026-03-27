/**
 * CompanyContextBar
 * Shows the active company + site at the top of every page.
 * Clicking allows switching. Auto-updates when company/site changes.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { companiesAPI, sitesAPI } from '../../services/api'
import useSyncStore from '../../store/syncStore'
import { Building2, MapPin, ChevronDown, Check, X } from 'lucide-react'

function CompanySwitcher({ onClose }) {
  const { activeCompanyId, activeSiteId, setActiveCompany, setActiveSite } = useSyncStore()
  const [step, setStep] = useState('company') // 'company' | 'site'
  const [selectedCompany, setSelectedCompany] = useState(activeCompanyId)

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => companiesAPI.getAll({ limit: 100, isActive: 'true' }).then(r => r.data.data),
  })

  const { data: sites } = useQuery({
    queryKey: ['sites-by-company', selectedCompany],
    queryFn: () => sitesAPI.getAll({ companyId: selectedCompany, limit: 100 }).then(r => r.data.data),
    enabled: !!selectedCompany && step === 'site',
  })

  const handleSelectCompany = (id) => {
    setSelectedCompany(id)
    setActiveCompany(id)
    setActiveSite(null)
    setStep('site')
  }

  const handleSelectSite = (id) => {
    setActiveSite(id)
    onClose()
  }

  const handleSkipSite = () => {
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <h2 className="section-title">
              {step === 'company' ? 'Select Company' : 'Select Site'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              {step === 'company'
                ? 'Choose which company context to work in'
                : 'Optionally select a site within this company'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto">
          {step === 'company' && companies?.map(c => (
            <button key={c.id} onClick={() => handleSelectCompany(c.id)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-1"
              style={{
                background: selectedCompany === c.id ? 'rgba(var(--accent),0.1)' : 'transparent',
                border: `1px solid ${selectedCompany === c.id ? 'rgba(var(--accent),0.25)' : 'transparent'}`,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent),0.1)', border: '1px solid rgba(var(--accent),0.2)' }}>
                <Building2 size={16} style={{ color: 'rgb(var(--accent-light))' }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{c.name}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  {c.code} {c.city ? `· ${c.city}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.is_default && <span className="badge badge-accent" style={{ fontSize: 9 }}>Default</span>}
                {selectedCompany === c.id && <Check size={14} style={{ color: 'rgb(var(--accent-light))' }} />}
              </div>
            </button>
          ))}

          {step === 'site' && (
            <>
              <button onClick={handleSkipSite}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1"
                style={{ border: '1px solid rgba(var(--border))' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(var(--bg-hover))' }}>
                  <Building2 size={13} style={{ color: 'rgb(var(--text-muted))' }} />
                </div>
                <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                  All Sites (company-wide)
                </span>
              </button>
              {sites?.map(s => (
                <button key={s.id} onClick={() => handleSelectSite(s.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1"
                  style={{
                    background: activeSiteId === s.id ? 'rgba(var(--success),0.08)' : 'transparent',
                    border: `1px solid ${activeSiteId === s.id ? 'rgba(34,197,94,0.25)' : 'transparent'}`,
                  }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: s.is_hq ? 'rgba(var(--accent),0.1)' : 'rgba(var(--bg-hover))' }}>
                    <MapPin size={13} style={{ color: s.is_hq ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{s.name}</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                      {s.type} {s.city ? `· ${s.city}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.is_hq && <span className="badge badge-accent" style={{ fontSize: 9 }}>HQ</span>}
                    {activeSiteId === s.id && <Check size={13} style={{ color: '#22c55e' }} />}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {step === 'site' && (
          <div className="px-5 pb-4">
            <button onClick={() => setStep('company')}
              className="btn-secondary text-xs px-3 py-1.5 w-full justify-center">
              ← Back to Companies
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CompanyContextBar() {
  const [showSwitcher, setShowSwitcher] = useState(false)
  const { activeCompanyId, activeSiteId } = useSyncStore()

  const { data: company } = useQuery({
    queryKey: ['active-company', activeCompanyId],
    queryFn: () => activeCompanyId
      ? companiesAPI.getById(activeCompanyId).then(r => r.data.data)
      : companiesAPI.getAll({ limit: 1 }).then(r => r.data.data?.find(c => c.is_default) || r.data.data?.[0]),
    staleTime: 2 * 60 * 1000,
  })

  const { data: site } = useQuery({
    queryKey: ['active-site', activeSiteId],
    queryFn: () => sitesAPI.getById(activeSiteId).then(r => r.data.data),
    enabled: !!activeSiteId,
    staleTime: 2 * 60 * 1000,
  })

  if (!company) return null

  return (
    <>
      <div className="flex items-center gap-0 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(var(--border))', background: 'rgba(var(--bg-secondary),0.5)' }}>
        <button
          onClick={() => setShowSwitcher(true)}
          className="flex items-center gap-2 px-4 py-2 transition-all hover:bg-white/[0.03] flex-shrink-0"
          style={{ borderRight: '1px solid rgba(var(--border))' }}>
          <Building2 size={13} style={{ color: 'rgb(var(--accent-light))' }} />
          <span className="text-xs font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            {company.name}
          </span>
          {company.is_default && (
            <span className="badge badge-accent" style={{ fontSize: 9 }}>Default</span>
          )}
          <ChevronDown size={11} style={{ color: 'rgb(var(--text-muted))' }} />
        </button>

        {site ? (
          <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
            <MapPin size={12} style={{ color: '#22c55e' }} />
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
              {site.name}
            </span>
            {site.is_hq && <span className="badge badge-accent" style={{ fontSize: 9 }}>HQ</span>}
            <button
              onClick={() => useSyncStore.getState().setActiveSite(null)}
              className="btn-ghost p-0.5 ml-0.5">
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-4 py-2 flex-shrink-0">
            <MapPin size={12} style={{ color: 'rgb(var(--text-muted))' }} />
            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>All Sites</span>
          </div>
        )}

        {/* Quick info strip */}
        <div className="flex items-center gap-4 px-4 py-2 ml-auto flex-shrink-0">
          {company.currency && (
            <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
              {company.currency}
            </span>
          )}
          {company.gstin && (
            <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
              GST: {company.gstin}
            </span>
          )}
          {company.city && (
            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              📍 {company.city}
            </span>
          )}
        </div>
      </div>

      {showSwitcher && <CompanySwitcher onClose={() => setShowSwitcher(false)} />}
    </>
  )
}
