from icalendar import Calendar, Event

with open("c:/users/pab/desktop/basic.ics", "r", encoding='utf-8') as f:
    calendar_data = f.read()
    gcal = Calendar.from_ical(calendar_data)
    for component in gcal.walk():
        if not component.name in ["VEVENT","VALARM"]:
            print(component.name)
            if component.name == "VCALENDAR":
                name = component.get("X-WR-CALNAME")
                print(name.replace("@","_at_").replace(".","_"))
                dump = str(component)
                with open("dump.txt", "w", encoding='utf-8') as f2:
                    f2.write(dump)
