import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, AppBar, Avatar, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Drawer, FormControl, InputLabel,
  List, ListItemButton, ListItemText, MenuItem, Paper, Select, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Toolbar, Typography,
} from '@mui/material'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import api from './api'
import './App.css'

const drawerWidth = 250
const priorities = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' }
const searchStatuses = { ACTIVE: 'Activa', IN_PROCESS: 'En proceso', INTERVIEW: 'En entrevistas', CLOSED: 'Cerrada' }
const applicationStatuses = { APPLIED: 'Postulado', REVIEW: 'En revisión', INTERVIEW: 'Entrevista', SELECTED: 'Seleccionado', REJECTED: 'Descartado' }
const modalities = { ONSITE: 'Presencial', HYBRID: 'Híbrido', REMOTE: 'Remoto' }
const blankSearch = { position: '', practice: '', priority: 'MEDIUM', status: 'ACTIVE', opening_date: '', requester: '', description: '' }
const blankCandidate = { first_name: '', last_name: '', email: '', phone: '', experience_years: '', region: '', modality: 'HYBRID', linkedin: '', cv_file: null }

const messageFrom = (error, fallback) => {
  const data = error.response?.data
  if (data?.detail) return Array.isArray(data.detail) ? data.detail[0] : data.detail
  const field = data && Object.keys(data)[0]
  return field && Array.isArray(data[field]) ? data[field][0] : fallback
}

const dateLabel = (date) => date ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`)) : '—'

function StatCard({ label, value, tone }) {
  return <Paper className={`stat-card stat-card--${tone}`} elevation={0}><Typography variant="overline">{label}</Typography><Typography className="stat-value">{value ?? '—'}</Typography></Paper>
}

function Sidebar({ candidateCount }) {
  const navigate = useNavigate()
  const location = useLocation()
  const links = [{ path: '/searches', label: 'Búsquedas', mark: '▦' }, { path: '/candidates', label: 'Candidatos', mark: '◉' }]

  return <Drawer variant="permanent" className="app-drawer" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth } }}>
    <Box className="brand"><Box className="brand-mark">S</Box><Box className="brand-copy"><Typography>Socius</Typography><span>Talent workspace</span></Box></Box>
    <Box className="navigation"><Typography className="nav-label">RECLUTAMIENTO</Typography><List disablePadding>{links.map((link) => <ListItemButton key={link.path} selected={location.pathname === link.path} onClick={() => navigate(link.path)} className="nav-item"><Box className="nav-mark">{link.mark}</Box><ListItemText primary={link.label} />{link.path === '/candidates' && <Chip label={candidateCount ?? 0} size="small" />}</ListItemButton>)}</List></Box>
    <Box className="sidebar-note">MVP de reclutamiento<br />Socius · 2026</Box>
  </Drawer>
}

function SearchDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(blankSearch)
  const [saving, setSaving] = useState(false)
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault(); setSaving(true)
    try { await api.post('/searches/', form); toast.success('Búsqueda creada correctamente'); setForm(blankSearch); onSaved(); onClose() } catch (error) { toast.error(messageFrom(error, 'No fue posible crear la búsqueda')) } finally { setSaving(false) }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" onSubmit={submit}><DialogTitle>Nueva búsqueda</DialogTitle><DialogContent className="dialog-form">
    <TextField label="Posición" value={form.position} onChange={change('position')} required fullWidth />
    <TextField label="Práctica" value={form.practice} onChange={change('practice')} required fullWidth />
    <Box className="form-grid"><FormControl fullWidth><InputLabel id="priority-label">Prioridad</InputLabel><Select labelId="priority-label" label="Prioridad" value={form.priority} onChange={change('priority')}>{Object.entries(priorities).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel id="status-label">Estado</InputLabel><Select labelId="status-label" label="Estado" value={form.status} onChange={change('status')}>{Object.entries(searchStatuses).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box>
    <Box className="form-grid"><TextField label="Fecha de apertura" type="date" value={form.opening_date} onChange={change('opening_date')} required fullWidth slotProps={{ inputLabel: { shrink: true } }} /><TextField label="Solicitante" value={form.requester} onChange={change('requester')} required fullWidth /></Box>
    <TextField label="Descripción" value={form.description} onChange={change('description')} multiline minRows={3} fullWidth />
  </DialogContent><DialogActions><Button onClick={onClose} color="inherit">Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Crear búsqueda'}</Button></DialogActions></Box></Dialog>
}

function CandidateDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(blankCandidate)
  const [saving, setSaving] = useState(false)
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault(); setSaving(true)
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => { if (value !== '' && value !== null) payload.append(key, value) })
    try { await api.post('/candidates/', payload); toast.success('Candidato registrado en la base de talentos'); setForm(blankCandidate); onSaved(); onClose() } catch (error) { toast.error(messageFrom(error, 'No fue posible registrar al candidato')) } finally { setSaving(false) }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" onSubmit={submit}><DialogTitle>Registrar candidato</DialogTitle><DialogContent className="dialog-form">
    <Box className="form-grid"><TextField label="Nombre" value={form.first_name} onChange={change('first_name')} required fullWidth /><TextField label="Apellido" value={form.last_name} onChange={change('last_name')} required fullWidth /></Box>
    <TextField label="Correo electrónico" type="email" value={form.email} onChange={change('email')} required fullWidth />
    <Box className="form-grid"><TextField label="Teléfono" value={form.phone} onChange={change('phone')} fullWidth /><TextField label="Años de experiencia" type="number" inputProps={{ min: 0 }} value={form.experience_years} onChange={change('experience_years')} required fullWidth /></Box>
    <Box className="form-grid"><TextField label="Región" value={form.region} onChange={change('region')} required fullWidth /><FormControl fullWidth><InputLabel id="modality-label">Modalidad</InputLabel><Select labelId="modality-label" label="Modalidad" value={form.modality} onChange={change('modality')}>{Object.entries(modalities).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box>
    <TextField label="LinkedIn" type="url" value={form.linkedin} onChange={change('linkedin')} fullWidth />
    <Button component="label" variant="outlined" color="inherit" className="file-control">{form.cv_file ? form.cv_file.name : 'Adjuntar CV (PDF, máximo 5 MB)'}<input hidden type="file" accept="application/pdf,.pdf" onChange={(event) => setForm((current) => ({ ...current, cv_file: event.target.files?.[0] ?? null }))} /></Button>
  </DialogContent><DialogActions><Button onClick={onClose} color="inherit">Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Registrar candidato'}</Button></DialogActions></Box></Dialog>
}

function ApplicationDialog({ candidate, open, onClose, onSaved }) {
  const [searches, setSearches] = useState([])
  const [searchId, setSearchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const request = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await api.get('/searches/', { params: { status: 'ACTIVE' } })
        setSearches(response.data)
        setSearchId(response.data[0] ? String(response.data[0].id) : '')
      } catch (error) {
        toast.error(messageFrom(error, 'No se pudieron cargar las búsquedas activas'))
      } finally {
        setLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(request)
  }, [open])

  const submit = async (event) => {
    event.preventDefault()
    if (!candidate || !searchId) return

    setSaving(true)
    try {
      await api.post('/applications/', {
        candidate: candidate.id,
        recruitment_search: Number(searchId),
        status: 'APPLIED',
      })
      toast.success(`${candidate.full_name} fue asociado a la búsqueda`)
      onSaved()
      onClose()
    } catch (error) {
      toast.error(messageFrom(error, 'No fue posible crear la postulación'))
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><Box component="form" onSubmit={submit}>
    <DialogTitle>Asociar a una búsqueda</DialogTitle>
    <DialogContent className="dialog-form">
      <Typography className="dialog-description">Crearás una postulación en estado <strong>Postulado</strong> para {candidate?.full_name ?? 'este candidato'}.</Typography>
      {loading ? <Box className="dialog-loading"><CircularProgress size={26} /></Box> : searches.length === 0 ? <Alert severity="info">No hay búsquedas activas disponibles para asociar.</Alert> : <FormControl fullWidth required><InputLabel id="application-search-label">Búsqueda activa</InputLabel><Select labelId="application-search-label" label="Búsqueda activa" value={searchId} onChange={(event) => setSearchId(event.target.value)}>{searches.map((search) => <MenuItem key={search.id} value={String(search.id)}>{search.position} · {search.practice}</MenuItem>)}</Select></FormControl>}
    </DialogContent>
    <DialogActions><Button onClick={onClose} color="inherit">Cancelar</Button><Button type="submit" variant="contained" disabled={loading || saving || !searchId}>{saving ? 'Asociando…' : 'Crear postulación'}</Button></DialogActions>
  </Box></Dialog>
}

function Searches({ refreshSummary }) {
  const [searches, setSearches] = useState([])
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({ position: '', practice: '', priority: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { const [searchResult, dashboardResult] = await Promise.all([api.get('/searches/', { params: filters }), api.get('/dashboard/')]); setSearches(searchResult.data); setSummary(dashboardResult.data) } catch (error) { toast.error(messageFrom(error, 'No se pudo cargar la información de búsquedas')) } finally { setLoading(false) }
  }, [filters])
  useEffect(() => {
    const request = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(request)
  }, [load])
  const change = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }))
  const copyLink = async (id) => { try { await navigator.clipboard.writeText(`${window.location.origin}/postular/${id}`); toast.success('Link público copiado') } catch { toast('No fue posible copiar el link') } }
  const saved = () => { load(); refreshSummary() }
  return <><Box className="heading"><Box><Typography className="eyebrow">PANORAMA GENERAL</Typography><Typography variant="h4">Búsquedas de talento</Typography><Typography className="subtitle">Gestiona procesos, prioridades y candidatos desde un solo lugar.</Typography></Box><Button variant="contained" className="main-action" onClick={() => setDialogOpen(true)}>+ Nueva búsqueda</Button></Box>
    <Box className="stats"><StatCard label="Búsquedas activas" value={summary?.active_searches} tone="teal" /><StatCard label="En proceso" value={summary?.in_process} tone="blue" /><StatCard label="En entrevistas" value={summary?.in_interview} tone="coral" /><StatCard label="Candidatos totales" value={summary?.total_candidates} tone="gold" /></Box>
    <Paper className="filter-panel" elevation={0}><Box className="filter-title"><span>⌕</span><Typography fontWeight={800}>Filtrar búsquedas</Typography></Box><Box className="filter-grid"><TextField label="Posición" value={filters.position} onChange={change('position')} size="small" fullWidth /><TextField label="Práctica" value={filters.practice} onChange={change('practice')} size="small" fullWidth /><FormControl size="small" fullWidth><InputLabel id="search-priority-filter">Prioridad</InputLabel><Select labelId="search-priority-filter" label="Prioridad" value={filters.priority} onChange={change('priority')}><MenuItem value="">Todas</MenuItem>{Object.entries(priorities).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl><FormControl size="small" fullWidth><InputLabel id="search-status-filter">Estado</InputLabel><Select labelId="search-status-filter" label="Estado" value={filters.status} onChange={change('status')}><MenuItem value="">Todos</MenuItem>{Object.entries(searchStatuses).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box></Paper>
    <Box className="table-heading"><Typography fontWeight={800}>{searches.length} resultados</Typography><Typography variant="body2">Actualizado desde la base de datos</Typography></Box>
    <TableContainer component={Paper} className="data-table" elevation={0}><Table><TableHead><TableRow><TableCell>Posición</TableCell><TableCell>Práctica</TableCell><TableCell>Prioridad</TableCell><TableCell>Estado</TableCell><TableCell>Apertura</TableCell><TableCell>Solicitante</TableCell><TableCell align="center">Candidatos</TableCell><TableCell /></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={8} align="center" className="table-state"><CircularProgress size={26} /></TableCell></TableRow> : searches.length === 0 ? <TableRow><TableCell colSpan={8} align="center" className="table-state">No encontramos búsquedas con estos filtros.</TableCell></TableRow> : searches.map((search) => <TableRow key={search.id} hover><TableCell><Typography fontWeight={800}>{search.position}</Typography><Typography variant="caption">#{search.id}</Typography></TableCell><TableCell>{search.practice}</TableCell><TableCell><Chip label={priorities[search.priority]} size="small" className={`priority priority--${search.priority.toLowerCase()}`} /></TableCell><TableCell><Chip label={searchStatuses[search.status]} size="small" className={`state state--${search.status.toLowerCase()}`} /></TableCell><TableCell>{dateLabel(search.opening_date)}</TableCell><TableCell>{search.requester}</TableCell><TableCell align="center"><Box className="count">{search.candidate_count}</Box></TableCell><TableCell align="right"><Button size="small" onClick={() => copyLink(search.public_id)}>Copiar link</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>
    <SearchDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={saved} /></>
}

function Candidates({ refreshSummary }) {
  const [candidates, setCandidates] = useState([])
  const [applications, setApplications] = useState([])
  const [filters, setFilters] = useState({ name: '', search: '' })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [applicationCandidate, setApplicationCandidate] = useState(null)
  const load = useCallback(async () => { setLoading(true); try { const [candidateResult, applicationResult] = await Promise.all([api.get('/candidates/', { params: filters }), api.get('/applications/')]); setCandidates(candidateResult.data); setApplications(applicationResult.data) } catch (error) { toast.error(messageFrom(error, 'No se pudo cargar la base de talentos')) } finally { setLoading(false) } }, [filters])
  useEffect(() => {
    const request = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(request)
  }, [load])
  const applicationsByCandidate = useMemo(() => applications.reduce((current, application) => ({ ...current, [application.candidate]: current[application.candidate] ?? application }), {}), [applications])
  const change = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }))
  return <><Box className="heading"><Box><Typography className="eyebrow">BASE DE TALENTOS</Typography><Typography variant="h4">Candidatos</Typography><Typography className="subtitle">Explora perfiles disponibles y sus postulaciones activas.</Typography></Box><Button variant="contained" className="main-action" onClick={() => setDialogOpen(true)}>+ Registrar candidato</Button></Box>
    <Paper className="filter-panel candidate-filter" elevation={0}><TextField label="Buscar por nombre" value={filters.name} onChange={change('name')} size="small" fullWidth /><TextField label="ID de búsqueda" placeholder="Ej. 1" value={filters.search} onChange={change('search')} size="small" /></Paper>
    <Box className="table-heading"><Typography fontWeight={800}>{candidates.length} candidatos</Typography><Typography variant="body2">Talento registrado en Socius</Typography></Box>
    <TableContainer component={Paper} className="data-table" elevation={0}><Table><TableHead><TableRow><TableCell>Candidato</TableCell><TableCell>Cargo asociado</TableCell><TableCell>Postulación</TableCell><TableCell>Experiencia</TableCell><TableCell>Región</TableCell><TableCell>Modalidad</TableCell><TableCell>Ingreso</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={8} align="center" className="table-state"><CircularProgress size={26} /></TableCell></TableRow> : candidates.length === 0 ? <TableRow><TableCell colSpan={8} align="center" className="table-state">No encontramos candidatos con estos filtros.</TableCell></TableRow> : candidates.map((candidate) => { const application = applicationsByCandidate[candidate.id]; return <TableRow key={candidate.id} hover><TableCell><Typography fontWeight={800}>{candidate.full_name}</Typography><Typography variant="caption">{candidate.email}</Typography></TableCell><TableCell>{application?.recruitment_search_position ?? 'Base de talentos'}</TableCell><TableCell>{application ? <Chip label={applicationStatuses[application.status]} size="small" className="application-status" /> : <Typography variant="caption">Sin postulación</Typography>}</TableCell><TableCell>{candidate.experience_years} años</TableCell><TableCell>{candidate.region}</TableCell><TableCell><Chip label={modalities[candidate.modality]} size="small" className="modality" /></TableCell><TableCell>{dateLabel(candidate.created_at?.slice(0, 10))}</TableCell><TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end">{candidate.cv_file && <Button href={candidate.cv_file} target="_blank" size="small">CV</Button>}<Button size="small" variant="outlined" onClick={() => setApplicationCandidate(candidate)}>Postular</Button></Stack></TableCell></TableRow> })}</TableBody></Table></TableContainer>
    <CandidateDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => { load(); refreshSummary() }} />
    <ApplicationDialog candidate={applicationCandidate} open={Boolean(applicationCandidate)} onClose={() => setApplicationCandidate(null)} onSaved={() => { load(); refreshSummary() }} /></>
}

function App() {
  const [summary, setSummary] = useState(null)
  const refreshSummary = useCallback(async () => { try { const result = await api.get('/dashboard/'); setSummary(result.data) } catch { /* The pages expose loading errors. */ } }, [])
  useEffect(() => {
    const request = window.setTimeout(() => { void refreshSummary() }, 0)
    return () => window.clearTimeout(request)
  }, [refreshSummary])
  return <Box className="app-shell"><Sidebar candidateCount={summary?.total_candidates} /><Box component="main" className="main-area" sx={{ ml: `${drawerWidth}px` }}><AppBar position="static" elevation={0} className="topbar"><Toolbar><Typography className="topbar-label">RECLUTAMIENTO / SOCIUS</Typography><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Typography variant="body2">Equipo de selección</Typography><Avatar className="avatar">RS</Avatar></Stack></Toolbar></AppBar><Box className="content"><Routes><Route path="/" element={<Navigate to="/searches" replace />} /><Route path="/searches" element={<Searches refreshSummary={refreshSummary} />} /><Route path="/candidates" element={<Candidates refreshSummary={refreshSummary} />} /><Route path="*" element={<Alert severity="info">Esta vista aún no está disponible.</Alert>} /></Routes></Box></Box><Toaster position="bottom-right" toastOptions={{ duration: 3500 }} /></Box>
}

export default App
