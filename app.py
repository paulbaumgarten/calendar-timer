import flask
from flask_session import Session
import json
import requests
import os
from icalendar import Calendar, Event
from datetime import datetime, date
from pprint import pprint

app = flask.Flask(__name__)
app.config['SECRET_KEY'] = 'booyeah!secret!'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = os.path.join(app.root_path, "cache") # Store session data in a /cache folder
app.config['SESSION_FILE_THRESHOLD'] = 1000 # Allow up to 1000 sessions
Session(app)

@app.route('/')
def home():
    return flask.redirect("/static/index.html")

@app.route('/favicon.ico')
def favicon():
    return flask.send_file("static/favicon.ico")

def get_calendar_name(ical_text):
    gcal = Calendar.from_ical(ical_text)
    for component in gcal.walk():
        if component.name == "VCALENDAR":
            name = component.get("X-WR-CALNAME")
            return name
    return ""

def download_ical(ical_url):
    # Check url is valid (enough...ish)
    if not ical_url.startswith("https://calendar.google.com/calendar/ical/") or not ical_url.endswith(".ics"):
        return "error", ical_url
    # Download the file
    print(f"Downloading {ical_url}")
    response = requests.get(ical_url)
    if response.status_code == 200:
        # Obtain the response text
        text = response.text
        # Get calendar name
        filename = get_calendar_name(text).replace("@","_at_").replace(".","_")
        # Save to file
        if len(filename) > 0:
            filename = os.path.join(app.root_path, "calendars", filename+".ical")
            with open(filename, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"ical file written to: '{filename}'")
        return filename, ical_url
    else:
        print("Error downloading ical data")
        print(f"url: {ical_url}")
        print(f"status code: {response.status_code}")
        return "error", ical_url

def parse_ical(ical_file):
    data = ""
    with open(ical_file, "r", encoding='utf-8') as f:
        data = f.read()
    gcal = Calendar.from_ical(data)
    today = []
    for component in gcal.walk():
        if component.name == "VEVENT":
            event_start = component.get('dtstart').dt
            if isinstance(event_start, datetime):
                if event_start.date() >= datetime.today().date():
                    event = {
                        "summary" : str(component.get('summary')),
                        "start-utc-string" : component.get('dtstart').dt.strftime("%Y-%m-%d %H:%M"),
                        "finish-utc-string" : component.get('dtend').dt.strftime("%Y-%m-%d %H:%M"),
                        "start-utc-timestamp" : component.get('dtstart').dt.timestamp(),
                        "finish-utc-timestamp" : component.get('dtend').dt.timestamp()
                    }
                    label = event['summary']
                    # Only show up to the first space character
                    if label.count(" ") >= 1:
                        label = label.split(" ")[0]
                    # If length is > 10, shorten it
                    if len(label) > 10:
                        label = label[:10]
                    event['label'] = label
                    today.append(event)
    pprint(today)
    return today

@app.route('/calendardata', methods=["POST"])
def calendardata():
    if flask.request.is_json:
        # Download the ical file
        data = flask.request.json
        if 'ical' in data:
            filename, url = download_ical(data['ical'])
            # Save information to the user session
            flask.session['ical_url'] = url
            flask.session['ical'] = filename
            # Parse the ical file
            browser_json = parse_ical(filename)
            # Send the browser data
            return flask.jsonify(browser_json)
        else:
            return '{ "error" : "ical not set" }'
    elif 'ical' in flask.session:
        # ical file already downloaded, parase the ical file
        # Send the browser data
        return json.dumps({})
        # return json.dumps(today)
    else:
        # Inform browser we do not have ical information
        return '{ "error" : "ical not set" }'

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True)
