import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SyncBanner from '../components/ui/SyncBanner'
import ChangeHistoryDrawer from '../components/ui/ChangeHistoryDrawer'
import useSyncStore from '../store/syncStore'
import { changeHistoryAPI } from '../services/api'
import { companiesAPI, sitesAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Building2, Plus, Edit, Trash2, X, Globe, Phone, Mail,
  MapPin, CreditCard, Search, RefreshCw, Star, Check,
  ChevronRight, Eye, Shield, Clock
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const COMPANY_TYPES = [
  { value: 'private_limited', label: 'Private Limited' },
  { value: 'public_limited',  label: 'Public Limited' },
  { value: 'llp',             label: 'LLP' },
  { value: 'partnership',     label: 'Partnership' },
  { value: 'proprietorship',  label: 'Proprietorship' },
  { value: 'ngo',             label: 'NGO / Non-Profit' },
  { value: 'government',      label: 'Government' },
  { value: 'other',           label: 'Other' },
]
const INDUSTRIES = [
  'Information Technology','Finance & Banking','Healthcare','Manufacturing',
  'Retail & E-commerce','Education','Logistics','Real Estate',
  'Hospitality','Consulting','Media & Entertainment','Other',
]
const CURRENCIES = ['INR','USD','EUR','GBP','AED','SGD','AUD']
const TIMEZONES  = ['Asia/Kolkata','Asia/Dubai','America/New_York','America/Los_Angeles',
                    'Europe/London','Europe/Paris','Asia/Singapore','Australia/Sydney']

/* ─── Company Form Modal ─────────────────────────────────────────── */
function CompanyModal({ company, onClose, onSaved, onSyncResult }) {
  const isEdit = !!company
  const [tab, setTab] = useState('basic')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: company ? {
      code: company.code, name: company.name, legalName: company.legal_name,
      type: company.type, industry: company.industry, website: company.website,
      email: company.email, phone: company.phone, fax: company.fax,
      addressLine1: company.address_line1, addressLine2: company.address_line2,
      city: company.city, state: company.state, country: company.country,
      pincode: company.pincode, panNumber: company.pan_number, gstin: company.gstin,
      tanNumber: company.tan_number, cinNumber: company.cin_number,
      currency: company.currency, timezone: company.timezone,
      fiscalYearStart: company.fiscal_year_start,
      bankName: company.bank_name, bankAccount: company.bank_account,
      bankIfsc: company.bank_ifsc, bankBranch: company.bank_branch,
      isActive: company.is_active, isDefault: company.is_default,
      description: company.description,
    } : { type: 'private_limited', currency: 'INR', timezone: 'Asia/Kolkata',
          fiscalYearStart: '04-01', country: 'India', isActive: true }
  })

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        const res = await companiesAPI.update(company.id, data)
        onSyncResult?.('company', data.name, res.data?.data?.syncSummary)
      } else {
        await companiesAPI.create(data)
      }
      toast.success(isEdit ? 'Company updated' : 'Company created')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const TABS = [
    { id: 'basic',    label: 'Basic Info' },
    { id: 'address',  label: 'Address' },
    { id: 'legal',    label: 'Legal & Tax' },
    { id: 'banking',  label: 'Banking' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 700 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent),0.12)', border: '1px solid rgba(var(--accent),0.2)' }}>
              <Building2 size={16} style={{ color: 'rgb(var(--accent-light))' }} />
            </div>
            <h2 className="section-title">{isEdit ? `Edit: ${company.name}` : 'New Company'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-0.5 px-5 pt-4 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: tab === t.id ? 'rgba(var(--accent),0.15)' : 'transparent',
                color: tab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
                border: tab === t.id ? '1px solid rgba(var(--accent),0.25)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-5 overflow-y-auto" style={{ maxHeight: '60vh' }}>

            {/* ── BASIC ── */}
            {tab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Company Code *</label>
                    <input className="input-field font-mono"
                      placeholder="CORP001"
                      {...register('code', { required: 'Code is required' })} />
                    {errors.code && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.code.message}</p>}
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select className="input-field" {...register('type')}>
                      {COMPANY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Company Name *</label>
                  <input className="input-field"
                    placeholder="Acme Corporation Pvt Ltd"
                    {...register('name', { required: 'Name is required' })} />
                  {errors.name && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>}
                </div>
                <div>
                  <label className="label">Legal / Registered Name</label>
                  <input className="input-field" placeholder="Full legal name"
                    {...register('legalName')} />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select className="input-field" {...register('industry')}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input-field" {...register('email')} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input-field" {...register('phone')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Website</label>
                    <input className="input-field" placeholder="https://example.com" {...register('website')} />
                  </div>
                  <div>
                    <label className="label">Fax</label>
                    <input className="input-field" {...register('fax')} />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input-field" rows={2} {...register('description')} />
                </div>
              </div>
            )}

            {/* ── ADDRESS ── */}
            {tab === 'address' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Address Line 1</label>
                  <input className="input-field" placeholder="Street address" {...register('addressLine1')} />
                </div>
                <div>
                  <label className="label">Address Line 2</label>
                  <input className="input-field" placeholder="Area / Locality" {...register('addressLine2')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">City</label>
                    <input className="input-field" {...register('city')} />
                  </div>
                  <div>
                    <label className="label">State / Province</label>
                    <input className="input-field" {...register('state')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Country</label>
                    <input className="input-field" {...register('country')} />
                  </div>
                  <div>
                    <label className="label">Pincode / ZIP</label>
                    <input className="input-field font-mono" {...register('pincode')} />
                  </div>
                </div>
              </div>
            )}

            {/* ── LEGAL ── */}
            {tab === 'legal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">PAN Number</label>
                    <input className="input-field font-mono uppercase" placeholder="AABCU9603R"
                      {...register('panNumber')} />
                  </div>
                  <div>
                    <label className="label">GSTIN</label>
                    <input className="input-field font-mono uppercase" placeholder="27AABCU9603R1ZX"
                      {...register('gstin')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">TAN Number</label>
                    <input className="input-field font-mono uppercase" {...register('tanNumber')} />
                  </div>
                  <div>
                    <label className="label">CIN Number</label>
                    <input className="input-field font-mono uppercase" {...register('cinNumber')} />
                  </div>
                </div>
                <div>
                  <label className="label">Registration Number</label>
                  <input className="input-field font-mono" {...register('regNumber')} />
                </div>
              </div>
            )}

            {/* ── BANKING ── */}
            {tab === 'banking' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Bank Name</label>
                    <input className="input-field" placeholder="HDFC Bank" {...register('bankName')} />
                  </div>
                  <div>
                    <label className="label">Branch</label>
                    <input className="input-field" {...register('bankBranch')} />
                  </div>
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input className="input-field font-mono" {...register('bankAccount')} />
                </div>
                <div>
                  <label className="label">IFSC Code</label>
                  <input className="input-field font-mono uppercase" placeholder="HDFC0001234"
                    {...register('bankIfsc')} />
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {tab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Currency</label>
                    <select className="input-field" {...register('currency')}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Fiscal Year Start</label>
                    <input className="input-field font-mono" placeholder="04-01"
                      {...register('fiscalYearStart')} />
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>MM-DD format</p>
                  </div>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select className="input-field" {...register('timezone')}>
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Active</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Company is operational</p>
                  </div>
                  <input type="checkbox" {...register('isActive')} style={{ accentColor: 'rgb(var(--accent))', width: 16, height: 16 }} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(var(--accent),0.06)', border: '1px solid rgba(var(--accent),0.15)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--accent-light))' }}>Default Company</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Used for new transactions by default</p>
                  </div>
                  <input type="checkbox" {...register('isDefault')} style={{ accentColor: 'rgb(var(--accent))', width: 16, height: 16 }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-5 pb-5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting
                ? <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32"/>
                    </svg>Saving...
                  </span>
                : isEdit ? 'Update Company' : 'Create Company'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Delete Confirm ─────────────────────────────────────────────── */
function DeleteConfirm({ company, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 380 }}>
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(var(--danger),0.1)', border: '1px solid rgba(var(--danger),0.2)' }}>
            <Trash2 size={22} style={{ color: 'rgb(var(--danger))' }} />
          </div>
          <div>
            <h3 className="section-title">Delete Company</h3>
            <p className="text-sm mt-1.5" style={{ color: 'rgb(var(--text-muted))' }}>
              Delete <strong style={{ color: 'rgb(var(--text-primary))' }}>"{company.name}"</strong>?
              {parseInt(company.site_count) > 0 && (
                <span className="block mt-1 text-xs" style={{ color: 'rgb(var(--danger))' }}>
                  ⚠ Remove all {company.site_count} site(s) first.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Company Detail Drawer ─────────────────────────────────────── */
function CompanyDetail({ company, onClose, onEdit }) {
  const { data, isLoading } = useQuery({
    queryKey: ['company-detail', company.id],
    queryFn: () => companiesAPI.getById(company.id).then(r => r.data.data),
  })
  const c = data || company
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 680 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent),0.12)', border: '1px solid rgba(var(--accent),0.2)' }}>
              <Building2 size={17} style={{ color: 'rgb(var(--accent-light))' }} />
            </div>
            <div>
              <p className="font-display font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{c.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs badge badge-neutral">{c.code}</span>
                {c.is_default && <span className="badge badge-accent" style={{ fontSize: 10 }}>⭐ Default</span>}
                <span className={`badge ${c.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onClose(); onEdit(company) }} className="btn-secondary text-xs px-3 py-1.5">
              <Edit size={12} /> Edit
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5" style={{ maxHeight: '72vh' }}>
          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Mail,    label: 'Email',    value: c.email },
              { icon: Phone,   label: 'Phone',    value: c.phone },
              { icon: Globe,   label: 'Website',  value: c.website },
              { icon: MapPin,  label: 'City',     value: [c.city, c.state, c.country].filter(Boolean).join(', ') },
              { icon: Shield,  label: 'GSTIN',    value: c.gstin },
              { icon: CreditCard, label: 'Currency', value: c.currency },
            ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 rounded-xl"
                style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={11} style={{ color: 'rgb(var(--text-muted))' }} />
                  <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p>
                </div>
                <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Sites */}
          {data?.sites?.length > 0 && (
            <div>
              <p className="section-title mb-3">Sites ({data.sites.length})</p>
              <div className="space-y-2">
                {data.sites.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <MapPin size={14} style={{ color: s.is_hq ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{[s.city, s.state].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="flex gap-1">
                      {s.is_hq && <span className="badge badge-accent" style={{ fontSize: 9 }}>HQ</span>}
                      <span className="badge badge-neutral" style={{ fontSize: 9 }}>{s.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function CompanyPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [viewing, setViewing]       = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const { handleSyncResult } = useSyncStore()
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['companies', search, page],
    queryFn: () => companiesAPI.getAll({ search, page, limit: 12 }).then(r => r.data),
    keepPreviousData: true,
  })
  const { data: stats } = useQuery({
    queryKey: ['company-stats'],
    queryFn: () => companiesAPI.getStats().then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => companiesAPI.delete(id),
    onSuccess: () => {
      toast.success('Company deleted')
      queryClient.invalidateQueries(['companies'])
      queryClient.invalidateQueries(['company-stats'])
      setDeleting(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const companies = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="space-y-5">
      <SyncBanner />
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Companies', value: stats.total,       color: 'rgb(var(--accent-light))' },
            { label: 'Active',          value: stats.active,      color: 'rgb(var(--success))' },
            { label: 'Inactive',        value: stats.inactive,    color: 'rgb(var(--text-muted))' },
            { label: 'Total Sites',     value: stats.total_sites, color: 'rgb(var(--warning))' },
            { label: 'Default',         value: stats.defaults,    color: 'rgb(var(--info))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search companies..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <button onClick={() => queryClient.invalidateQueries(['companies'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {hasPermission('company','create') && (
          <button className="btn-primary whitespace-nowrap"
            onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={14} /> New Company
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-44" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={42} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="font-semibold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>No companies found</p>
          {hasPermission('company','create') && (
            <button className="btn-primary mx-auto" onClick={() => { setEditing(null); setShowModal(true) }}>
              <Plus size={14} /> Create Company
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map(c => (
            <div key={c.id} className="card-hover p-5 flex flex-col gap-3"
              style={{ opacity: c.is_active ? 1 : 0.65 }}>
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(var(--accent),0.1)', border: '1px solid rgba(var(--accent),0.2)' }}>
                    <Building2 size={17} style={{ color: 'rgb(var(--accent-light))' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>{c.code}</span>
                      {c.is_default && (
                        <span className="badge badge-accent" style={{ fontSize: 10 }}>⭐ Default</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewing(c)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                    style={{ color: 'rgb(var(--text-muted))' }}>
                    <Eye size={12} />
                  </button>
                  <button onClick={() => setHistoryFor(c)}
                    title="Change History"
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                    style={{ color: 'rgb(var(--text-muted))' }}>
                    <Clock size={12} />
                  </button>
                  {hasPermission('company','update') && (
                    <button onClick={() => { setEditing(c); setShowModal(true) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <Edit size={12} />
                    </button>
                  )}
                  {hasPermission('company','delete') && !c.is_default && (
                    <button onClick={() => setDeleting(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: 'rgb(var(--danger))' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={11} style={{ color: 'rgb(var(--text-muted))' }} />
                    <span className="text-xs truncate" style={{ color: 'rgb(var(--text-secondary))' }}>{c.email}</span>
                  </div>
                )}
                {c.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={11} style={{ color: 'rgb(var(--text-muted))' }} />
                    <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                      {[c.city, c.state, c.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid rgba(var(--border))' }}>
                <span className={`badge ${c.is_active ? 'badge-success' : 'badge-neutral'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-3">
                  {c.gstin && <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{c.gstin.substring(0,6)}...</span>}
                  <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    {c.site_count ?? 0} site{parseInt(c.site_count) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            {pagination.total} companies · Page {pagination.page}/{pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p-1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p+1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <CompanyModal
          company={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { queryClient.invalidateQueries(['companies']); queryClient.invalidateQueries(['company-stats']) }}
          onSyncResult={handleSyncResult}
        />
      )}
      {deleting && (
        <DeleteConfirm
          company={deleting}
          loading={deleteMutation.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
        />
      )}
      {historyFor && (
        <ChangeHistoryDrawer
          entityType="company"
          entityId={historyFor.id}
          entityName={historyFor.name}
          fetchFn={() => changeHistoryAPI.getCompanyChanges(historyFor.id)}
          onClose={() => setHistoryFor(null)}
        />
      )}
      {viewing && (
        <CompanyDetail
          company={viewing}
          onClose={() => setViewing(null)}
          onEdit={(c) => { setEditing(c); setShowModal(true) }}
        />
      )}
    </div>
  )
}
