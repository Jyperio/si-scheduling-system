import { useState, useEffect } from 'react';
import { getAvailability, createAvailability, deleteAvailability, getBookings, updateBookingStatus } from '../api';
import Calendar from './Calendar';

function formatTime(time24) {
  const [h, m] = time24.split(':');
  const d = new Date();
  d.setHours(h, m, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getTodayStr() {
  const d = new Date();
  const pad = n => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function SIDashboard() {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  
  // New Slot State
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [slotsData, bookingsData] = await Promise.all([
        getAvailability(),
        getBookings()
      ]);
      setSlots(slotsData);
      setBookings(bookingsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });
    try {
      await createAvailability({ date: selectedDate, start_time: newStart, end_time: newEnd });
      setStatusMsg({ type: 'success', text: 'Slot created successfully!' });
      setNewStart(''); setNewEnd('');
      loadData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Are you sure you want to delete this open slot?")) return;
    try {
      await deleteAvailability(id);
      loadData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Mark session as ${newStatus}?`)) return;
    try {
      await updateBookingStatus(id, newStatus);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Build calendar markers
  const dateModifiers = {};
  slots.forEach(s => {
    if (!dateModifiers[s.date]) dateModifiers[s.date] = [];
    if (s.is_booked && !dateModifiers[s.date].includes('booked')) dateModifiers[s.date].push('booked');
    if (!s.is_booked && !dateModifiers[s.date].includes('open')) dateModifiers[s.date].push('open');
  });

  // Daily filtered data
  const daySlots = slots.filter(s => s.date === selectedDate && !s.is_booked);
  const dayBookings = bookings.filter(b => b.date === selectedDate);

  return (
    <div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', color: 'var(--primary-color)' }}>Instructor Dashboard</h2>

      {statusMsg.text && (
        <div className={`alert alert-${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
        
        {/* Calendar Column */}
        <div style={{ flex: '1 1 350px', minWidth: 0 }}>
          <Calendar 
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dateModifiers={dateModifiers}
          />
        </div>

        {/* Daily Details Column */}
        <div style={{ flex: '2 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Add Slot Panel */}
          <div className="panel" style={{ margin: 0, padding: '1.5rem' }}>
            <h3 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Manage {formatDate(selectedDate)}</h3>
            <form onSubmit={handleCreateSlot} className="flex gap-4 items-center">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start Time</label>
                <input type="time" className="form-control" required value={newStart} onChange={e => setNewStart(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End Time</label>
                <input type="time" className="form-control" required value={newEnd} onChange={e => setNewEnd(e.target.value)} />
              </div>
              <div style={{ alignSelf: 'flex-end', width: '100%' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 0 }}>Create Slot</button>
              </div>
            </form>
          </div>

          {/* Scheduled Sessions Today */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Booked Sessions</h3>
            {dayBookings.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p>No student bookings for this date.</p>
              </div>
            ) : (
              <div className="appointment-list grid-list" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                 {dayBookings.map(b => (
                   <div key={b.id} className="card" style={{ padding: '1.25rem' }}>
                     <div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                         <div>
                           <h4 className="card-title" style={{ fontSize: '1.1rem' }}>{b.student_name}</h4>
                           <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{b.student_email}</p>
                         </div>
                         <span className={`badge badge-${b.status}`}>{b.status}</span>
                       </div>
                       <div className="card-body">
                         <p><strong>Course &amp; Topic:</strong> {b.course} — {b.topic}</p>
                         <p><strong>Time:</strong> {formatTime(b.start_time)} - {formatTime(b.end_time)}</p>
                         {b.notes && <p style={{ marginTop: '0.75rem' }}><strong>Notes:</strong> {b.notes}</p>}
                       </div>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                       {b.status === 'scheduled' && (
                         <>
                           <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', background: 'var(--success-color)' }} onClick={() => handleStatusChange(b.id, 'completed')}>Completed</button>
                           <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', color: 'var(--error-color)' }} onClick={() => handleStatusChange(b.id, 'canceled')}>Cancel</button>
                         </>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
          
          {/* Open Slots Today */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Unbooked Open Slots</h3>
            {daySlots.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p>No remaining open slots for this date.</p>
              </div>
            ) : (
               <div className="grid-list" style={{ gridTemplateColumns: 'fr', gap: '1rem' }}>
                 {daySlots.map(slot => (
                   <div key={slot.id} className="card" style={{ padding: '1.25rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                     </div>
                     <button className="btn btn-danger" style={{ padding: '0.5rem 1rem', margin: 0 }} onClick={() => handleDeleteSlot(slot.id)}>Delete</button>
                   </div>
                 ))}
               </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default SIDashboard;
