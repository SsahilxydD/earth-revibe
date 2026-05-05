'use client';
import { DatePicker, parseDate } from '@ark-ui/react/date-picker';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface CalendarPickerProps {
  value?: string; // ISO date string or datetime-local format
  onChange?: (value: string) => void;
}

export function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  const defaultValue = value ? [parseDate(new Date(value))] : [parseDate(new Date())];

  return (
    <DatePicker.Root
      inline
      defaultValue={defaultValue}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      onValueChange={(details) => {
        if (details.value.length > 0 && onChange) {
          const d = details.value[0];
          // Format as datetime-local compatible string
          const date = new Date(d.year, d.month - 1, d.day, 23, 59);
          const formatted = date.toISOString().slice(0, 16);
          onChange(formatted);
        }
      }}
    >
      <DatePicker.Content className="bg-black border border-white/10 rounded-xl shadow-lg p-3 inline-block">
        <DatePicker.View view="day">
          <DatePicker.Context>
            {(api) => (
              <>
                <DatePicker.ViewControl className="flex items-center justify-between mb-3">
                  <DatePicker.PrevTrigger className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/60">
                    <ChevronLeftIcon className="w-4 h-4" />
                  </DatePicker.PrevTrigger>
                  <DatePicker.ViewTrigger className="text-sm font-medium text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors">
                    <DatePicker.RangeText />
                  </DatePicker.ViewTrigger>
                  <DatePicker.NextTrigger className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/60">
                    <ChevronRightIcon className="w-4 h-4" />
                  </DatePicker.NextTrigger>
                </DatePicker.ViewControl>
                <DatePicker.Table className="w-full border-separate border-spacing-y-0.5">
                  <DatePicker.TableHead>
                    <DatePicker.TableRow>
                      {api.weekDays.map((weekDay, id) => (
                        <DatePicker.TableHeader
                          key={id}
                          className="text-sm font-medium text-white/40 w-9 h-7 text-center"
                        >
                          {weekDay.narrow}
                        </DatePicker.TableHeader>
                      ))}
                    </DatePicker.TableRow>
                  </DatePicker.TableHead>
                  <DatePicker.TableBody>
                    {api.weeks.map((week, id) => (
                      <DatePicker.TableRow key={id}>
                        {week.map((day, id) => (
                          <DatePicker.TableCell key={id} value={day} className="p-0">
                            <DatePicker.TableCellTrigger className="relative w-9 h-9 text-sm text-white hover:bg-white/10 transition-colors data-selected:bg-white data-selected:text-black rounded-lg data-outside-range:text-white/25 flex items-center justify-center font-medium data-today:after:content-[''] data-today:after:absolute data-today:after:bottom-0.5 data-today:after:w-1 data-today:after:h-1 data-today:after:bg-white data-today:after:rounded-full data-selected:data-today:after:bg-black">
                              {day.day}
                            </DatePicker.TableCellTrigger>
                          </DatePicker.TableCell>
                        ))}
                      </DatePicker.TableRow>
                    ))}
                  </DatePicker.TableBody>
                </DatePicker.Table>
              </>
            )}
          </DatePicker.Context>
        </DatePicker.View>
        <DatePicker.View view="month">
          <DatePicker.Context>
            {(api) => (
              <>
                <DatePicker.ViewControl className="flex items-center justify-between mb-4">
                  <DatePicker.PrevTrigger className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/60">
                    <ChevronLeftIcon className="w-4 h-4" />
                  </DatePicker.PrevTrigger>
                  <DatePicker.ViewTrigger className="text-base font-semibold text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors">
                    <DatePicker.RangeText />
                  </DatePicker.ViewTrigger>
                  <DatePicker.NextTrigger className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/60">
                    <ChevronRightIcon className="w-4 h-4" />
                  </DatePicker.NextTrigger>
                </DatePicker.ViewControl>
                <DatePicker.Table className="w-full border-separate border-spacing-y-0.5">
                  <DatePicker.TableBody>
                    {api.getMonthsGrid({ columns: 4, format: 'short' }).map((months, id) => (
                      <DatePicker.TableRow key={id}>
                        {months.map((month, id) => (
                          <DatePicker.TableCell key={id} value={month.value}>
                            <DatePicker.TableCellTrigger className="w-16 h-10 text-sm text-white hover:bg-white/10 hover:rounded-lg rounded-lg transition-colors data-selected:bg-white data-selected:text-black data-selected:rounded-lg flex items-center justify-center font-medium">
                              {month.label}
                            </DatePicker.TableCellTrigger>
                          </DatePicker.TableCell>
                        ))}
                      </DatePicker.TableRow>
                    ))}
                  </DatePicker.TableBody>
                </DatePicker.Table>
              </>
            )}
          </DatePicker.Context>
        </DatePicker.View>
        <DatePicker.View view="year">
          <DatePicker.Context>
            {(api) => (
              <>
                <DatePicker.ViewControl className="flex items-center justify-between mb-4">
                  <DatePicker.PrevTrigger className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/60">
                    <ChevronLeftIcon className="w-4 h-4" />
                  </DatePicker.PrevTrigger>
                  <DatePicker.ViewTrigger className="text-base font-semibold text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors">
                    <DatePicker.RangeText />
                  </DatePicker.ViewTrigger>
                  <DatePicker.NextTrigger className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/60">
                    <ChevronRightIcon className="w-4 h-4" />
                  </DatePicker.NextTrigger>
                </DatePicker.ViewControl>
                <DatePicker.Table className="w-full border-separate border-spacing-y-0.5">
                  <DatePicker.TableBody>
                    {api.getYearsGrid({ columns: 4 }).map((years, id) => (
                      <DatePicker.TableRow key={id}>
                        {years.map((year, id) => (
                          <DatePicker.TableCell key={id} value={year.value}>
                            <DatePicker.TableCellTrigger className="w-16 h-10 text-sm text-white hover:bg-white/10 hover:rounded-lg rounded-lg transition-colors data-selected:bg-white data-selected:text-black data-selected:rounded-lg flex items-center justify-center font-medium">
                              {year.label}
                            </DatePicker.TableCellTrigger>
                          </DatePicker.TableCell>
                        ))}
                      </DatePicker.TableRow>
                    ))}
                  </DatePicker.TableBody>
                </DatePicker.Table>
              </>
            )}
          </DatePicker.Context>
        </DatePicker.View>
      </DatePicker.Content>
    </DatePicker.Root>
  );
}
