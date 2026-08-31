import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, AppBar, Avatar, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Drawer, FormControl, InputLabel,
  IconButton, List, ListItemButton, ListItemText, MenuItem, Paper, Select, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Toolbar, Tooltip, Typography,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import api from './api'
import './App.css'

const drawerWidth = 250
const priorities = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' }
const searchStatuses = { ACTIVE: 'Activa', IN_PROCESS: 'En proceso', INTERVIEW: 'En entrevistas', CLOSED: 'Cerrada' }
const applicationStatuses = { APPLIED: 'Postulado', REVIEW: 'En revisión', INTERVIEW: 'Entrevista', SELECTED: 'Seleccionado', REJECTED: 'Descartado' }
const modalities = { ONSITE: 'Presencial', HYBRID: 'Híbrido', REMOTE: 'Remoto' }
const publicApplicationEnabled = false
const blankSearch = { position: '', practice: '', priority: 'MEDIUM', status: 'ACTIVE', opening_date: '', requester: '', description: '' }
const blankCandidate = { first_name: '', last_name: '', email: '', phone: '', experience_years: '', region: '', modality: 'HYBRID', linkedin: '', cv_file: null }
const searchForm = (search) => search ? { position: search.position, practice: search.practice, priority: search.priority, status: search.status, opening_date: search.opening_date, requester: search.requester, description: search.description ?? '' } : blankSearch
const messageTranslations = {
  'This field is required.': 'Este campo es obligatorio.',
  'Enter a valid email address.': 'Ingresa una dirección de correo electrónico válida.',
  'Enter a valid URL.': 'Ingresa una URL válida.',
  'Enter a valid date.': 'Ingresa una fecha válida.',
  'A valid integer is required.': 'Ingresa un número entero válido.',
  'Ensure this value is greater than or equal to 0.': 'El valor debe ser igual o mayor que 0.',
  'Not found.': 'No se encontró el recurso solicitado.',
  'Authentication credentials were not provided.': 'Debes iniciar sesión para realizar esta acción.',
}

const localizedMessage = (message) => {
  const text = String(message)
  if (messageTranslations[text]) return messageTranslations[text]
  if (/^Invalid pk .+ - object does not exist\.$/.test(text)) return 'El registro seleccionado no existe.'
  if (/^Incorrect type\. Expected pk value, received .+\.$/.test(text)) return 'Selecciona un registro válido.'
  if (/^.+ is not a valid choice\.$/.test(text)) return 'Selecciona una opción válida.'
  return text
}

const messageFrom = (error, fallback) => {
  const data = error.response?.data
  if (data?.detail) return localizedMessage(Array.isArray(data.detail) ? data.detail[0] : data.detail)
  const field = data && Object.keys(data)[0]
  return field && Array.isArray(data[field]) ? localizedMessage(data[field][0]) : fallback
}

const fieldErrorsFrom = (error) => {
  const data = error.response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}

  return Object.entries(data).reduce((errors, [field, messages]) => {
    if (field !== 'detail' && field !== 'non_field_errors') {
      errors[field] = localizedMessage(Array.isArray(messages) ? messages[0] : messages)
    }
    return errors
  }, {})
}

const dateLabel = (date) => date ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`)) : '—'
const normalizeUrl = (value) => {
  const url = value.trim()
  return url && !/^[a-z][a-z\d+.-]*:\/\//i.test(url) ? `https://${url}` : url
}

function StatCard({ label, value, tone }) {
  return <Paper className={`stat-card stat-card--${tone}`} elevation={0}><Typography variant="overline">{label}</Typography><Typography className="stat-value">{value ?? '—'}</Typography></Paper>
}

function TableLoadError({ message, colSpan, onRetry }) {
  return <TableRow><TableCell colSpan={colSpan} className="table-state"><Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Reintentar</Button>}>{message}</Alert></TableCell></TableRow>
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

function SearchDialog({ open, onClose, onSaved, search }) {
  const [form, setForm] = useState(() => searchForm(search))
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const change = (field) => (event) => { setForm((current) => ({ ...current, [field]: event.target.value })); setFieldErrors((current) => ({ ...current, [field]: undefined })); setFormError('') }

  const validate = () => {
    const errors = {}
    if (!form.position.trim()) errors.position = 'Ingresa la posición buscada.'
    if (!form.practice.trim()) errors.practice = 'Ingresa la práctica.'
    if (!form.opening_date) errors.opening_date = 'Selecciona la fecha de apertura.'
    if (!form.requester.trim()) errors.requester = 'Ingresa el nombre del solicitante.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) {
      setFormError('Completa los campos obligatorios para continuar.')
      return
    }
    setSaving(true)
    try { if (search) { await api.patch(`/searches/${search.id}/`, form); toast.success('Búsqueda actualizada correctamente') } else { await api.post('/searches/', form); toast.success('Búsqueda creada correctamente') }; setForm(blankSearch); onSaved(); onClose() } catch (error) { const message = messageFrom(error, search ? 'No fue posible actualizar la búsqueda' : 'No fue posible crear la búsqueda'); setFieldErrors(fieldErrorsFrom(error)); setFormError(message); toast.error(message) } finally { setSaving(false) }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" noValidate onSubmit={submit}><DialogTitle>{search ? 'Editar búsqueda' : 'Nueva búsqueda'}</DialogTitle><DialogContent className="dialog-form">
    {formError && <Alert severity="error">{formError}</Alert>}
    <TextField label="Posición" value={form.position} onChange={change('position')} error={Boolean(fieldErrors.position)} helperText={fieldErrors.position} required fullWidth />
    <TextField label="Práctica" value={form.practice} onChange={change('practice')} error={Boolean(fieldErrors.practice)} helperText={fieldErrors.practice} required fullWidth />
    <Box className="form-grid"><FormControl fullWidth><InputLabel id="priority-label">Prioridad</InputLabel><Select labelId="priority-label" label="Prioridad" value={form.priority} onChange={change('priority')}>{Object.entries(priorities).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel id="status-label">Estado</InputLabel><Select labelId="status-label" label="Estado" value={form.status} onChange={change('status')}>{Object.entries(searchStatuses).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box>
    <Box className="form-grid"><TextField label="Fecha de apertura" type="date" value={form.opening_date} onChange={change('opening_date')} error={Boolean(fieldErrors.opening_date)} helperText={fieldErrors.opening_date} required fullWidth slotProps={{ inputLabel: { shrink: true } }} /><TextField label="Solicitante" value={form.requester} onChange={change('requester')} error={Boolean(fieldErrors.requester)} helperText={fieldErrors.requester} required fullWidth /></Box>
    <TextField label="Descripción" value={form.description} onChange={change('description')} multiline minRows={3} fullWidth />
  </DialogContent><DialogActions><Button onClick={onClose} color="inherit">Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : search ? 'Guardar cambios' : 'Crear búsqueda'}</Button></DialogActions></Box></Dialog>
}

function SearchApplicationsDialog({ search, open, onClose }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!open || !search) return undefined

    const request = window.setTimeout(async () => {
      setLoading(true)
      setErrorMessage('')
      try {
        const response = await api.get('/applications/', { params: { search: search.id } })
        setApplications(response.data)
      } catch (error) {
        const message = messageFrom(error, 'No se pudieron cargar las postulaciones')
        setApplications([])
        setErrorMessage(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(request)
  }, [open, search, retryKey])

  const updateStatus = async (application, status) => {
    if (status === application.status) return

    setSavingId(application.id)
    try {
      await api.patch(`/applications/${application.id}/`, { status })
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status } : item))
      toast.success(`Estado de ${application.candidate_name} actualizado`)
    } catch (error) {
      toast.error(messageFrom(error, 'No fue posible actualizar el estado'))
    } finally {
      setSavingId(null)
    }
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>Postulaciones · {search?.position}</DialogTitle>
    <DialogContent className="dialog-form">
      <Typography className="dialog-description">{search?.practice} · Solicitante: {search?.requester}</Typography>
      {loading ? <Box className="dialog-loading"><CircularProgress size={26} /></Box> : errorMessage ? <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setRetryKey((current) => current + 1)}>Reintentar</Button>}>{errorMessage}</Alert> : applications.length === 0 ? <Alert severity="info">Esta búsqueda todavía no tiene postulaciones.</Alert> : <TableContainer component={Paper} variant="outlined" className="applications-table"><Table size="small"><TableHead><TableRow><TableCell>Candidato</TableCell><TableCell>Correo</TableCell><TableCell>Estado</TableCell><TableCell>Fecha</TableCell></TableRow></TableHead><TableBody>{applications.map((application) => <TableRow key={application.id}><TableCell><Typography fontWeight={700}>{application.candidate_name}</Typography></TableCell><TableCell>{application.candidate_email}</TableCell><TableCell><FormControl size="small" className="application-status-control"><Select value={application.status} onChange={(event) => updateStatus(application, event.target.value)} aria-label={`Estado de ${application.candidate_name}`} disabled={savingId === application.id}>{Object.entries(applicationStatuses).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl></TableCell><TableCell>{dateLabel(application.applied_at?.slice(0, 10))}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
    </DialogContent>
    <DialogActions><Button onClick={onClose} color="inherit">Cerrar</Button></DialogActions>
  </Dialog>
}

function CandidateDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(blankCandidate)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const change = (field) => (event) => { setForm((current) => ({ ...current, [field]: event.target.value })); setFieldErrors((current) => ({ ...current, [field]: undefined })); setFormError('') }
  const changePhone = (event) => {
    const phone = event.target.value.replace(/\D/g, '').slice(0, 15)
    setForm((current) => ({ ...current, phone }))
    setFieldErrors((current) => ({ ...current, phone: undefined }))
    setFormError('')
  }
  const normalizeLinkedin = () => {
    setForm((current) => ({ ...current, linkedin: normalizeUrl(current.linkedin) }))
  }

  const validate = () => {
    const errors = {}
    if (!form.first_name.trim()) errors.first_name = 'Ingresa el nombre.'
    if (!form.last_name.trim()) errors.last_name = 'Ingresa el apellido.'
    if (!form.email.trim()) errors.email = 'Ingresa el correo electrónico.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Ingresa un correo electrónico válido.'
    if (form.experience_years === '') errors.experience_years = 'Indica los años de experiencia.'
    if (!form.region.trim()) errors.region = 'Ingresa la región.'
    if (form.linkedin) {
      try { new URL(normalizeUrl(form.linkedin)) } catch { errors.linkedin = 'Ingresa una URL válida de LinkedIn.' }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const selectCv = (event) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setFormError('El CV debe estar en formato PDF.')
      setFieldErrors((current) => ({ ...current, cv_file: 'Selecciona un archivo PDF válido.' }))
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('El CV no puede superar los 5 MB.')
      setFieldErrors((current) => ({ ...current, cv_file: 'Selecciona un PDF de hasta 5 MB.' }))
      event.target.value = ''
      return
    }

    setForm((current) => ({ ...current, cv_file: file }))
    setFieldErrors((current) => ({ ...current, cv_file: undefined }))
    setFormError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) {
      setFormError('Completa los campos obligatorios para continuar.')
      return
    }
    setSaving(true)
    const payload = new FormData()
    Object.entries({ ...form, linkedin: normalizeUrl(form.linkedin) }).forEach(([key, value]) => { if (value !== '' && value !== null) payload.append(key, value) })
    try { await api.post('/candidates/', payload); toast.success('Candidato registrado en la base de talentos'); setForm(blankCandidate); onSaved(); onClose() } catch (error) { const message = messageFrom(error, 'No fue posible registrar al candidato'); setFieldErrors(fieldErrorsFrom(error)); setFormError(message); toast.error(message) } finally { setSaving(false) }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" noValidate onSubmit={submit}><DialogTitle>Registrar candidato</DialogTitle><DialogContent className="dialog-form">
    {formError && <Alert severity="error">{formError}</Alert>}
    <Box className="form-grid"><TextField label="Nombre" value={form.first_name} onChange={change('first_name')} error={Boolean(fieldErrors.first_name)} helperText={fieldErrors.first_name} required fullWidth /><TextField label="Apellido" value={form.last_name} onChange={change('last_name')} error={Boolean(fieldErrors.last_name)} helperText={fieldErrors.last_name} required fullWidth /></Box>
    <TextField label="Correo electrónico" type="email" value={form.email} onChange={change('email')} error={Boolean(fieldErrors.email)} helperText={fieldErrors.email} required fullWidth />
    <Box className="form-grid"><TextField label="Teléfono" type="tel" inputMode="numeric" value={form.phone} onChange={changePhone} error={Boolean(fieldErrors.phone)} helperText={fieldErrors.phone ?? 'Opcional · solo números, máximo 15 dígitos.'} inputProps={{ maxLength: 15, pattern: '[0-9]*' }} fullWidth /><TextField label="Años de experiencia" type="number" inputProps={{ min: 0 }} value={form.experience_years} onChange={change('experience_years')} error={Boolean(fieldErrors.experience_years)} helperText={fieldErrors.experience_years} required fullWidth /></Box>
    <Box className="form-grid"><TextField label="Región" value={form.region} onChange={change('region')} error={Boolean(fieldErrors.region)} helperText={fieldErrors.region} required fullWidth /><FormControl fullWidth><InputLabel id="modality-label">Modalidad</InputLabel><Select labelId="modality-label" label="Modalidad" value={form.modality} onChange={change('modality')}>{Object.entries(modalities).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box>
    <TextField label="LinkedIn" type="url" value={form.linkedin} onChange={change('linkedin')} onBlur={normalizeLinkedin} error={Boolean(fieldErrors.linkedin)} helperText={fieldErrors.linkedin ?? 'Ejemplo: linkedin.com/in/tu-perfil'} fullWidth />
    <Box><Button component="label" variant="outlined" color="inherit" className="file-control" aria-describedby="cv-file-help">{form.cv_file ? form.cv_file.name : 'Adjuntar CV'}<input hidden type="file" accept="application/pdf,.pdf" onChange={selectCv} /></Button><Typography id="cv-file-help" className={`file-help${fieldErrors.cv_file ? ' file-help--error' : ''}`}>{fieldErrors.cv_file ?? 'Opcional · solo PDF, tamaño máximo de 5 MB.'}</Typography></Box>
  </DialogContent><DialogActions><Button onClick={onClose} color="inherit">Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Registrar candidato'}</Button></DialogActions></Box></Dialog>
}

function CandidateProfileDialog({ candidate, applications, open, onClose }) {
  const candidateApplications = applications.filter((application) => application.candidate === candidate?.id)

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Ficha de candidato</DialogTitle>
    <DialogContent className="dialog-form">
      <Box className="candidate-profile-heading"><Avatar className="candidate-profile-avatar">{candidate?.first_name?.[0]}{candidate?.last_name?.[0]}</Avatar><Box><Typography variant="h6" fontWeight={800}>{candidate?.full_name}</Typography><Typography className="dialog-description">Perfil de la base de talentos</Typography></Box></Box>
      <Box className="candidate-profile-grid"><Box><Typography className="profile-label">CORREO</Typography><Typography>{candidate?.email}</Typography></Box><Box><Typography className="profile-label">TELÉFONO</Typography><Typography>{candidate?.phone || 'No registrado'}</Typography></Box><Box><Typography className="profile-label">EXPERIENCIA</Typography><Typography>{candidate?.experience_years} años</Typography></Box><Box><Typography className="profile-label">UBICACIÓN Y MODALIDAD</Typography><Typography>{candidate?.region} · {modalities[candidate?.modality]}</Typography></Box></Box>
      <Stack direction="row" spacing={1} className="candidate-profile-links">{candidate?.linkedin && <Button component="a" href={candidate.linkedin} target="_blank" rel="noreferrer" size="small" variant="outlined">LinkedIn</Button>}{candidate?.cv_file && <Button component="a" href={candidate.cv_file} target="_blank" rel="noreferrer" size="small" variant="outlined">Ver CV</Button>}</Stack>
      <Typography className="profile-section-title">Postulaciones</Typography>
      {candidateApplications.length === 0 ? <Alert severity="info">Este candidato aún no tiene postulaciones asociadas.</Alert> : <TableContainer component={Paper} variant="outlined" className="applications-table"><Table size="small"><TableHead><TableRow><TableCell>Búsqueda</TableCell><TableCell>Estado</TableCell><TableCell>Fecha</TableCell></TableRow></TableHead><TableBody>{candidateApplications.map((application) => <TableRow key={application.id}><TableCell>{application.recruitment_search_position}</TableCell><TableCell><Chip label={applicationStatuses[application.status]} size="small" className={`application-status application-status--${application.status.toLowerCase()}`} /></TableCell><TableCell>{dateLabel(application.applied_at?.slice(0, 10))}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
    </DialogContent>
    <DialogActions><Button onClick={onClose} color="inherit">Cerrar</Button></DialogActions>
  </Dialog>
}

function ApplicationDialog({ candidate, open, onClose, onSaved }) {
  const [searches, setSearches] = useState([])
  const [searchId, setSearchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!open) return undefined

    const request = window.setTimeout(async () => {
      setLoading(true)
      setFormError('')
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
    setFormError('')
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
      const message = messageFrom(error, 'No fue posible crear la postulación')
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><Box component="form" onSubmit={submit}>
    <DialogTitle>Asociar a una búsqueda</DialogTitle>
    <DialogContent className="dialog-form">
      <Typography className="dialog-description">Crearás una postulación en estado <strong>Postulado</strong> para {candidate?.full_name ?? 'este candidato'}.</Typography>
      {formError && <Alert severity="error">{formError}</Alert>}
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
  const [errorMessage, setErrorMessage] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSearch, setEditingSearch] = useState(null)
  const [selectedSearch, setSelectedSearch] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try { const [searchResult, dashboardResult] = await Promise.all([api.get('/searches/', { params: filters }), api.get('/dashboard/')]); setSearches(searchResult.data); setSummary(dashboardResult.data) } catch (error) { const message = messageFrom(error, 'No se pudo cargar la información de búsquedas'); setErrorMessage(message); toast.error(message) } finally { setLoading(false) }
  }, [filters])
  useEffect(() => {
    const request = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(request)
  }, [load])
  const change = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }))
  const copyLink = async (id) => { try { await navigator.clipboard.writeText(`${window.location.origin}/postular/${id}`); toast.success('Link público copiado') } catch { toast('No fue posible copiar el link') } }
  const saved = () => { load(); refreshSummary() }
  const closeSearchDialog = () => { setDialogOpen(false); setEditingSearch(null) }
  return <><Box className="heading"><Box><Typography className="eyebrow">PANORAMA GENERAL</Typography><Typography variant="h4">Búsquedas de talento</Typography><Typography className="subtitle">Gestiona procesos, prioridades y candidatos desde un solo lugar.</Typography></Box><Button variant="contained" className="main-action" onClick={() => { setEditingSearch(null); setDialogOpen(true) }}>+ Nueva búsqueda</Button></Box>
    <Box className="stats"><StatCard label="Búsquedas activas" value={summary?.active_searches} tone="teal" /><StatCard label="En proceso" value={summary?.in_process} tone="blue" /><StatCard label="En entrevistas" value={summary?.in_interview} tone="coral" /><StatCard label="Candidatos totales" value={summary?.total_candidates} tone="gold" /></Box>
    <Paper className="filter-panel" elevation={0}><Box className="filter-title"><span>⌕</span><Typography fontWeight={800}>Filtrar búsquedas</Typography></Box><Box className="filter-grid"><TextField label="Posición" value={filters.position} onChange={change('position')} size="small" fullWidth /><TextField label="Práctica" value={filters.practice} onChange={change('practice')} size="small" fullWidth /><FormControl size="small" fullWidth><InputLabel id="search-priority-filter">Prioridad</InputLabel><Select labelId="search-priority-filter" label="Prioridad" value={filters.priority} onChange={change('priority')}><MenuItem value="">Todas</MenuItem>{Object.entries(priorities).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl><FormControl size="small" fullWidth><InputLabel id="search-status-filter">Estado</InputLabel><Select labelId="search-status-filter" label="Estado" value={filters.status} onChange={change('status')}><MenuItem value="">Todos</MenuItem>{Object.entries(searchStatuses).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box></Paper>
    <Box className="table-heading"><Typography fontWeight={800}>{searches.length} resultados</Typography><Typography variant="body2">Actualizado desde la base de datos</Typography></Box>
    <TableContainer component={Paper} className="data-table" elevation={0}><Table><TableHead><TableRow><TableCell>Posición</TableCell><TableCell>Práctica</TableCell><TableCell>Prioridad</TableCell><TableCell>Estado</TableCell><TableCell>Apertura</TableCell><TableCell>Solicitante</TableCell><TableCell align="center">Candidatos</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={8} align="center" className="table-state"><CircularProgress size={26} /></TableCell></TableRow> : errorMessage ? <TableLoadError message={errorMessage} colSpan={8} onRetry={() => { void load() }} /> : searches.length === 0 ? <TableRow><TableCell colSpan={8} align="center" className="table-state">No encontramos búsquedas con estos filtros.</TableCell></TableRow> : searches.map((search) => <TableRow key={search.id} hover><TableCell><Typography fontWeight={800}>{search.position}</Typography><Typography variant="caption">#{search.id}</Typography></TableCell><TableCell>{search.practice}</TableCell><TableCell><Chip label={priorities[search.priority]} size="small" className={`priority priority--${search.priority.toLowerCase()}`} /></TableCell><TableCell><Chip label={searchStatuses[search.status]} size="small" className={`state state--${search.status.toLowerCase()}`} /></TableCell><TableCell>{dateLabel(search.opening_date)}</TableCell><TableCell>{search.requester}</TableCell><TableCell align="center"><Tooltip title="Ver candidatos"><Button className="count count--action" aria-label={`Ver candidatos de ${search.position}`} onClick={() => setSelectedSearch(search)}>{search.candidate_count}</Button></Tooltip></TableCell><TableCell align="right" className="actions-cell"><Stack direction="row" spacing={0.5} justifyContent="flex-end" className="candidate-actions"><Tooltip title="Editar búsqueda"><IconButton className="candidate-action search-action" aria-label={`Editar búsqueda ${search.position}`} onClick={() => { setEditingSearch(search); setDialogOpen(true) }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>{publicApplicationEnabled && <Tooltip title="Copiar enlace público"><IconButton className="candidate-action candidate-action--cv" aria-label={`Copiar enlace de ${search.position}`} onClick={() => copyLink(search.public_id)}><DescriptionOutlinedIcon fontSize="small" /></IconButton></Tooltip>}</Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer>
    <SearchDialog key={`${editingSearch?.id ?? 'new'}-${dialogOpen}`} open={dialogOpen} onClose={closeSearchDialog} onSaved={saved} search={editingSearch} />
    <SearchApplicationsDialog search={selectedSearch} open={Boolean(selectedSearch)} onClose={() => setSelectedSearch(null)} /></>
}

function Candidates({ refreshSummary }) {
  const [candidates, setCandidates] = useState([])
  const [applications, setApplications] = useState([])
  const [availableSearches, setAvailableSearches] = useState([])
  const [filters, setFilters] = useState({ name: '', search: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [applicationCandidate, setApplicationCandidate] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const load = useCallback(async () => { setLoading(true); setErrorMessage(''); try { const [candidateResult, applicationResult, searchResult] = await Promise.all([api.get('/candidates/', { params: filters }), api.get('/applications/'), api.get('/searches/')]); setCandidates(candidateResult.data); setApplications(applicationResult.data); setAvailableSearches(searchResult.data) } catch (error) { const message = messageFrom(error, 'No se pudo cargar la base de talentos'); setErrorMessage(message); toast.error(message) } finally { setLoading(false) } }, [filters])
  useEffect(() => {
    const request = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(request)
  }, [load])
  const applicationsByCandidate = useMemo(() => applications.reduce((current, application) => ({ ...current, [application.candidate]: current[application.candidate] ?? application }), {}), [applications])
  const change = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }))
  return <><Box className="heading"><Box><Typography className="eyebrow">BASE DE TALENTOS</Typography><Typography variant="h4">Candidatos</Typography><Typography className="subtitle">Explora perfiles disponibles y sus postulaciones activas.</Typography></Box><Button variant="contained" className="main-action" onClick={() => setDialogOpen(true)}>+ Registrar candidato</Button></Box>
    <Paper className="filter-panel candidate-filter" elevation={0}><TextField label="Buscar por nombre" value={filters.name} onChange={change('name')} size="small" fullWidth /><FormControl size="small" fullWidth><InputLabel id="candidate-search-filter">Búsqueda</InputLabel><Select labelId="candidate-search-filter" label="Búsqueda" value={filters.search} onChange={change('search')}><MenuItem value="">Todas las búsquedas</MenuItem>{availableSearches.map((search) => <MenuItem key={search.id} value={String(search.id)}>{search.position}</MenuItem>)}</Select></FormControl><FormControl size="small" fullWidth><InputLabel id="candidate-status-filter">Estado</InputLabel><Select labelId="candidate-status-filter" label="Estado" value={filters.status} onChange={change('status')}><MenuItem value="">Todos los estados</MenuItem>{Object.entries(applicationStatuses).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl></Paper>
    <Box className="table-heading"><Typography fontWeight={800}>{candidates.length} candidatos</Typography><Typography variant="body2">Talento registrado en Socius</Typography></Box>
    <TableContainer component={Paper} className="data-table" elevation={0}><Table><TableHead><TableRow><TableCell>Candidato</TableCell><TableCell>Cargo asociado</TableCell><TableCell>Postulación</TableCell><TableCell>Experiencia</TableCell><TableCell>Región</TableCell><TableCell>Modalidad</TableCell><TableCell>Ingreso</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={8} align="center" className="table-state"><CircularProgress size={26} /></TableCell></TableRow> : errorMessage ? <TableLoadError message={errorMessage} colSpan={8} onRetry={() => { void load() }} /> : candidates.length === 0 ? <TableRow><TableCell colSpan={8} align="center" className="table-state">No encontramos candidatos con estos filtros.</TableCell></TableRow> : candidates.map((candidate) => { const application = applicationsByCandidate[candidate.id]; return <TableRow key={candidate.id} hover><TableCell><Typography fontWeight={800}>{candidate.full_name}</Typography><Typography variant="caption">{candidate.email}</Typography></TableCell><TableCell>{application?.recruitment_search_position ?? 'Base de talentos'}</TableCell><TableCell>{application ? <Chip label={applicationStatuses[application.status]} size="small" className="application-status" /> : <Typography variant="caption">Sin postulación</Typography>}</TableCell><TableCell>{candidate.experience_years} años</TableCell><TableCell>{candidate.region}</TableCell><TableCell><Chip label={modalities[candidate.modality]} size="small" className="modality" /></TableCell><TableCell>{dateLabel(candidate.created_at?.slice(0, 10))}</TableCell><TableCell align="right" className="actions-cell"><Stack direction="row" spacing={0.5} justifyContent="flex-end" className="candidate-actions"><Tooltip title="Ver perfil"><IconButton className="candidate-action candidate-action--profile" aria-label={`Ver perfil de ${candidate.full_name}`} onClick={() => setSelectedCandidate(candidate)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>{candidate.cv_file && <Tooltip title="Abrir CV"><IconButton component="a" href={candidate.cv_file} target="_blank" rel="noreferrer" className="candidate-action candidate-action--cv" aria-label={`Abrir CV de ${candidate.full_name}`}><DescriptionOutlinedIcon fontSize="small" /></IconButton></Tooltip>}<Tooltip title="Postular a una búsqueda"><IconButton className="candidate-action candidate-action--apply" aria-label={`Postular a ${candidate.full_name}`} onClick={() => setApplicationCandidate(candidate)}><PersonAddAlt1OutlinedIcon fontSize="small" /></IconButton></Tooltip></Stack></TableCell></TableRow> })}</TableBody></Table></TableContainer>
    <CandidateDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => { load(); refreshSummary() }} />
    <CandidateProfileDialog candidate={selectedCandidate} applications={applications} open={Boolean(selectedCandidate)} onClose={() => setSelectedCandidate(null)} />
    <ApplicationDialog candidate={applicationCandidate} open={Boolean(applicationCandidate)} onClose={() => setApplicationCandidate(null)} onSaved={() => { load(); refreshSummary() }} /></>
}

function App() {
  const [summary, setSummary] = useState(null)
  const refreshSummary = useCallback(async () => { try { const result = await api.get('/dashboard/'); setSummary(result.data) } catch { /* The pages expose loading errors. */ } }, [])
  useEffect(() => {
    const request = window.setTimeout(() => { void refreshSummary() }, 0)
    return () => window.clearTimeout(request)
  }, [refreshSummary])
  return <Box className="app-shell"><Sidebar candidateCount={summary?.total_candidates} /><Box component="main" className="main-area" sx={{ ml: `${drawerWidth}px` }}><AppBar position="static" elevation={0} className="topbar"><Toolbar><Typography className="topbar-label">RECLUTAMIENTO / SOCIUS</Typography><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Typography variant="body2">Equipo de selección</Typography><Avatar className="avatar">RF</Avatar></Stack></Toolbar></AppBar><Box className="content"><Routes><Route path="/" element={<Navigate to="/searches" replace />} /><Route path="/searches" element={<Searches refreshSummary={refreshSummary} />} /><Route path="/candidates" element={<Candidates refreshSummary={refreshSummary} />} /><Route path="*" element={<Alert severity="info">Esta vista aún no está disponible.</Alert>} /></Routes></Box></Box><Toaster position="bottom-right" toastOptions={{ duration: 3500 }} /></Box>
}

export default App
