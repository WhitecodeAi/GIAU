import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
  className?: string;
}

export function DateRangePicker({
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setIsStartPickerOpen(false);

    if (date && endDate) {
      onDateRangeChange(
        format(date, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd"),
      );
    } else if (date) {
      onDateRangeChange(format(date, "yyyy-MM-dd"), null);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setIsEndPickerOpen(false);

    if (startDate && date) {
      onDateRangeChange(
        format(startDate, "yyyy-MM-dd"),
        format(date, "yyyy-MM-dd"),
      );
    } else if (date) {
      onDateRangeChange(null, format(date, "yyyy-MM-dd"));
    }
  };

  const clearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onDateRangeChange(null, null);
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <div className="flex gap-2">
        <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "MMM dd, yyyy") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              disabled={(date) =>
                date > new Date() || (endDate && date > endDate)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "MMM dd, yyyy") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateChange}
              disabled={(date) =>
                date > new Date() || (startDate && date < startDate)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {(startDate || endDate) && (
        <Button variant="outline" size="sm" onClick={clearDates}>
          Clear
        </Button>
      )}
    </div>
  );
}
