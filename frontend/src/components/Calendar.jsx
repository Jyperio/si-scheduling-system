import { useState } from 'react';

function Calendar({ onDateSelect, selectedDate, dateModifiers }) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate + 'T12:00:00') || new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  function toDateStr(y, m, d) {
    const pad = n => n < 10 ? '0' + n : n;
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  const todayStr = toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <div className="calendar-container panel" style={{ padding: '1.5rem', marginBottom: 0 }}>
      <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', minWidth: '40px' }} onClick={handlePrev}>&larr;</button>
        <h3 style={{ fontWeight: 700, margin: 0, fontSize: '1.15rem' }}>
          {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', minWidth: '40px' }} onClick={handleNext}>&rarr;</button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="calendar-cell empty"></div>;
          
          const dateStr = toDateStr(year, month, day);
          const isSelected = selectedDate === dateStr;
          const mods = dateModifiers[dateStr] || [];
          const hasOpen = mods.includes('open');
          const hasBooked = mods.includes('booked');

          let cellClass = "calendar-cell";
          if (isSelected) cellClass += " selected";
          if (dateStr === todayStr) cellClass += " today";

          return (
            <div 
              key={dateStr} 
              className={cellClass} 
              onClick={() => onDateSelect(dateStr)}
            >
              <div className="calendar-date-num">{day}</div>
              <div className="calendar-indicators">
                {hasOpen && <span className="indicator open" title="Open Slots Available"></span>}
                {hasBooked && <span className="indicator booked" title="Booked Sessions"></span>}
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span className="indicator open" style={{ display: 'inline-block' }}></span> Open Slots
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span className="indicator booked" style={{ display: 'inline-block' }}></span> Booked
        </div>
      </div>
    </div>
  );
}

export default Calendar;
