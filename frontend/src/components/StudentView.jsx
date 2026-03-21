import { useState, useEffect } from 'react';
import { getAvailability, getBookings, createBooking, updateBookingStatus } from '../api';
import Calendar from './Calendar';

function formatTime(time24) {
  const [h, m] = time24.split(':');
  const d = new Date();
  d.setHours(h, m, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getTodayStr() {
  const d = new Date();
  const pad = n => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function StudentView() {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [formData, setFormData] = useState({ course: 'College Algebra', topic: '', notes: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setStatus({ type: '', msg: '' });
    try {
      const [slotsData, bookingsData] = await Promise.all([
        getAvailability('', 'false'),
        getBookings()
      ]);
      setSlots(slotsData.filter(s => !s.is_booked));
      setBookings(bookingsData);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to load booking data.' });
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });
    try {
      await createBooking({ ...formData, slot_id: selectedSlot.id });
      setStatus({ type: 'success', msg: 'Session booked successfully!' });
      setFormData({ course: 'College Algebra', topic: '', notes: '' });
      setSelectedSlot(null);
      loadData();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await updateBookingStatus(id, 'canceled');
      loadData();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const dateModifiers = {};
  slots.forEach(s => {
    if (!dateModifiers[s.date]) dateModifiers[s.date] = [];
    if (!dateModifiers[s.date].includes('open')) dateModifiers[s.date].push('open');
  });

  const filteredSlots = slots.filter(s => s.date === selectedDate);

  return (
    <div>
      <div className="hero-section">
        <h2>Book Office Hours<br/>Without the Back-and-Forth</h2>
        <p>Your Supplemental Instructor has reserved targeted time blocks for one-on-one help. Select an available session below to save your spot instantly.</p>
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type}`}>
          {status.msg}
        </div>
      )}

      {selectedSlot && (
        <div className="panel" id="booking-form">
          <div className="panel-header">
            <h3 className="panel-title">Confirm Your Session</h3>
            <p className="panel-description">
              {formatDate(selectedSlot.date)} from {formatTime(selectedSlot.start_time)} to {formatTime(selectedSlot.end_time)} with {selectedSlot.si_name}
            </p>
          </div>
          <form onSubmit={handleBook}>
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Course *</label>
                <select 
                  className="form-control" 
                  style={{ WebkitAppearance: 'auto', cursor: 'pointer' }}
                  required 
                  value={formData.course} 
                  onChange={e => setFormData({...formData, course: e.target.value})}
                >
                  <option value="College Algebra">College Algebra</option>
                  {/* Future scalable approach: {courses.map(c => <option key={c} value={c}>{c}</option>)} */}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Topic / Reason for help *</label>
                <input type="text" className="form-control" placeholder="e.g. Memory Management" required value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Additional Notes (Optional)</label>
              <textarea className="form-control" placeholder="Link any homework attachments or specific debug questions here..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
            <div className="flex gap-4" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </button>
              <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => setSelectedSlot(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bookings Section */}
      {!selectedSlot && bookings.length > 0 && (
        <div style={{ marginBottom: '4rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>My Scheduled Sessions</h3>
          <div className="appointment-list grid-list" style={{ gridTemplateColumns: '1fr' }}>
            {bookings.map(b => (
              <div key={b.id} className="card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h4 className="card-title">{b.course} - {b.topic}</h4>
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </div>
                  <div className="card-body">
                    <p><strong>Instructor:</strong> {b.si_name}</p>
                    <p><strong>Date:</strong> {formatDate(b.date)}</p>
                    <p><strong>Time:</strong> {formatTime(b.start_time)} - {formatTime(b.end_time)}</p>
                    {b.notes && <p style={{ marginTop: '0.5rem' }}><strong>Notes:</strong> {b.notes}</p>}
                  </div>
                </div>
                {b.status === 'scheduled' && (
                  <div style={{ display: 'flex' }}>
                    <button className="btn btn-secondary" style={{ color: 'var(--error-color)' }} onClick={() => handleCancelBooking(b.id)}>Cancel Booking</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar & Available Slots Section */}
      {!selectedSlot && (
        <div>
           <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Schedule an Appointment</h3>
           <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
             
             <div style={{ flex: '1 1 350px', minWidth: 0 }}>
               <Calendar 
                 selectedDate={selectedDate}
                 onDateSelect={setSelectedDate}
                 dateModifiers={dateModifiers}
               />
             </div>

             <div style={{ flex: '2 1 500px', minWidth: 0 }}>
               <div className="panel" style={{ margin: 0 }}>
                 <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                   <h3 className="panel-title">Available on {formatDate(selectedDate)}</h3>
                 </div>
                 
                 {filteredSlots.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem', border: 'none' }}>
                      <p>No open slots available on this date.</p>
                    </div>
                  ) : (
                    <div className="grid-list" style={{ gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1.5rem' }}>
                      {filteredSlots.map(slot => (
                        <div key={slot.id} className="card" style={{ padding: '1.25rem' }}>
                          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </p>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Instructor: {slot.si_name}</span>
                            </div>
                            <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', margin: 0 }} onClick={() => { setSelectedSlot(slot); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                              Select
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
             </div>
             
           </div>
        </div>
      )}
    </div>
  );
}

export default StudentView;
