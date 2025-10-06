'use client';

import { useState } from 'react';
import Link from 'next/link';

type Tier = 'insider' | 'founder' | 'influencer';
type Perk = {
  id: string;
  title: string;
  active: boolean | null;
  required_card_tier: Tier;
  starts_at: string | null;
  ends_at: string | null;
  business_id: string;
  redemption_count?: number; // Add this for analytics
};

type CalendarDayData = {
  perks: Perk[];
  redemptionCount: number;
  isCurrentMonth: boolean;
  date: Date;
};

interface CalendarMonthProps {
  year: number;
  month: number;
  perks: Perk[];
  redemptionData?: Record<string, number>; // Format: "YYYY-MM-DD": count
}

export default function CalendarMonth({ year, month, perks, redemptionData = {} }: CalendarMonthProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingPerk, setEditingPerk] = useState<Perk | null>(null);
  
  // Generate calendar days data
  const calendarData = generateCalendarData(year, month, perks, redemptionData);
  
  // Find the maximum redemption count for any day (for calculating heat map)
  const maxRedemptions = Math.max(
    1, // Avoid division by zero
    ...Object.values(calendarData).map(day => day.redemptionCount)
  );
  
  // Get days in month and calculate offset for first day
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Day names for header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  function handleDateClick(date: Date) {
    setSelectedDate(date);
    setEditingPerk(null);
  }
  
  function handlePerkClick(perk: Perk, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingPerk(perk);
  }
  
  function generateCalendarData(
    year: number, 
    month: number, 
    perks: Perk[], 
    redemptionData: Record<string, number>
  ): Record<string, CalendarDayData> {
    const result: Record<string, CalendarDayData> = {};
    
    // Get previous and next month days needed to fill calendar
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Start from last days of previous month if needed
    const firstDayOffset = firstDay.getDay();
    for (let i = 0; i < firstDayOffset; i++) {
      const day = daysInPrevMonth - firstDayOffset + i + 1;
      const date = new Date(year, month - 1, day);
      const dateKey = formatDateKey(date);
      
      result[dateKey] = {
        perks: getPerksForDate(perks, date),
        redemptionCount: redemptionData[dateKey] || 0,
        isCurrentMonth: false,
        date
      };
    }
    
    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      
      result[dateKey] = {
        perks: getPerksForDate(perks, date),
        redemptionCount: redemptionData[dateKey] || 0,
        isCurrentMonth: true,
        date
      };
    }
    
    // Next month days to complete grid
    const remainingDays = 42 - Object.keys(result).length; // 6 rows of 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateKey = formatDateKey(date);
      
      result[dateKey] = {
        perks: getPerksForDate(perks, date),
        redemptionCount: redemptionData[dateKey] || 0,
        isCurrentMonth: false,
        date
      };
    }
    
    return result;
  }
  
  function formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  
  function getPerksForDate(perks: Perk[], date: Date): Perk[] {
    const dateTimestamp = date.getTime();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();
    
    return perks.filter(perk => {
      if (!perk.active) return false;
      
      const startsAt = perk.starts_at ? new Date(perk.starts_at).getTime() : null;
      const endsAt = perk.ends_at ? new Date(perk.ends_at).getTime() : null;
      
      // Perk with no dates is always active
      if (!startsAt && !endsAt) return true;
      
      // Check if perk is active on this date
      if (startsAt && endsAt) {
        return startsAt <= endOfDay && endsAt >= startOfDay;
      }
      
      // Only start date set
      if (startsAt && !endsAt) {
        return startsAt <= endOfDay;
      }
      
      // Only end date set
      if (!startsAt && endsAt) {
        return endsAt >= startOfDay;
      }
      
      return false;
    });
  }
  
  // Get array of all calendar days for easy rendering
  const allDays = Object.values(calendarData);
  
  return (
    <div className="bg-black/10 rounded-lg border border-gray-800 overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-px bg-gray-800">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-300">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-800">
        {allDays.map(dayData => {
          const { date, perks, redemptionCount, isCurrentMonth } = dayData;
          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          // Calculate heat intensity based on redemption count (0-100)
          const heatIntensity = Math.min(100, Math.round((redemptionCount / maxRedemptions) * 100));
          
          return (
            <div 
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={`min-h-24 p-1 relative cursor-pointer transition-all
                ${isCurrentMonth ? 'bg-black/20' : 'bg-black/40 text-gray-500'}
                ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}
                ${isSelected ? 'ring-2 ring-white ring-inset' : ''}
                hover:bg-gray-800`}
              style={redemptionCount > 0 ? {
                background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), 
                             linear-gradient(rgba(74,222,128,${heatIntensity / 200}), rgba(74,222,128,${heatIntensity / 200}))`
              } : {}}
            >
              {/* Day number */}
              <div className="flex justify-between">
                <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                  {date.getDate()}
                </span>
                
                {redemptionCount > 0 && (
                  <span className="text-xs px-1 rounded bg-green-900/50 text-green-300">
                    {redemptionCount}
                  </span>
                )}
              </div>
              
              {/* Perks for this day */}
              <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                {perks.map(perk => (
                  <div
                    key={perk.id}
                    onClick={(e) => handlePerkClick(perk, e)}
                    className={`text-xs px-1 py-0.5 rounded truncate
                      ${perk.required_card_tier === 'founder' ? 'bg-blue-900/50 text-blue-200' : 
                        perk.required_card_tier === 'influencer' ? 'bg-purple-900/50 text-purple-200' :
                        'bg-amber-900/50 text-amber-200'}`}
                  >
                    {perk.title}
                  </div>
                ))}
              </div>
              
              {/* Number indicator if there are more perks than can be shown */}
              {perks.length > 3 && (
                <div className="absolute bottom-1 right-1 text-xs text-gray-400">
                  +{perks.length - 3}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Selected Date Details Panel */}
      {selectedDate && (
        <div className="border-t border-gray-800 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button 
              onClick={() => setSelectedDate(null)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          
          {editingPerk ? (
            <div className="border border-gray-700 rounded-lg p-3 bg-black/30">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium">{editingPerk.title}</h4>
                <button 
                  onClick={() => setEditingPerk(null)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Back
                </button>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Start date:</span>{' '}
                  {editingPerk.starts_at ? new Date(editingPerk.starts_at).toLocaleDateString() : 'No start date'}
                </div>
                <div>
                  <span className="text-gray-400">End date:</span>{' '}
                  {editingPerk.ends_at ? new Date(editingPerk.ends_at).toLocaleDateString() : 'No end date'}
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>{' '}
                  {editingPerk.active ? 'Active' : 'Hidden'}
                </div>
                <div>
                  <span className="text-gray-400">Tier:</span>{' '}
                  {editingPerk.required_card_tier}
                </div>
                
                <div className="pt-2">
                  <Link 
                    href={`/admin/perks/${editingPerk.id}/edit`} 
                    className="inline-block px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    Edit Perk
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                {calendarData[formatDateKey(selectedDate)].perks.length === 0 ? (
                  <p className="text-sm text-gray-400">No perks active on this date</p>
                ) : (
                  <div className="space-y-2">
                    {calendarData[formatDateKey(selectedDate)].perks.map(perk => (
                      <div 
                        key={perk.id} 
                        onClick={() => setEditingPerk(perk)}
                        className="p-2 border border-gray-700 rounded hover:bg-gray-800 cursor-pointer"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{perk.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full
                            ${perk.required_card_tier === 'founder' ? 'bg-blue-900/50 text-blue-200' : 
                              perk.required_card_tier === 'influencer' ? 'bg-purple-900/50 text-purple-200' :
                              'bg-amber-900/50 text-amber-200'}`}>
                            {perk.required_card_tier}
                          </span>
                        </div>
                        {perk.redemption_count && (
                          <div className="text-xs text-gray-400 mt-1">
                            {perk.redemption_count} redemptions
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button className="text-sm px-3 py-1 border border-gray-600 rounded hover:bg-gray-800">
                + Add Perk on This Date
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}