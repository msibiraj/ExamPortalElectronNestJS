**ProctorPlatform**

**Proctor Setup & Operations Manual**

*Step-by-step guide to creating questions, building templates,
scheduling exams, and monitoring candidates*

Version 2.0 \| February 2026 \| For Proctor Use Only

**Quick Reference --- End-to-End Workflow**

Running an exam on ProctorPlatform involves four stages. Complete them
in order. Each stage is explained in full detail in the sections that
follow.

  -------------------------------------------------------------------------
  **Stage**   **What You Do**       **Where**          **Time Required**
  ----------- --------------------- ------------------ --------------------
  1\. Build   Create and publish    Question Bank      30 min -- several
  Question    all questions you     screen             hours depending on
  Bank        want to use                              size

  2\. Build   Define exam           Template Builder   15--30 minutes
  Template    structure: sections,  screen             
              rules, marks,                            
              randomisation                            

  3\.         Create the exam       Exam Manager       5--10 minutes
  Schedule    event, set the time   screen             
  Exam        window, enrol                            
              candidates                               

  4\. Monitor Watch live feeds,     Live Monitor       Duration of exam +
  & Close     handle violations,    screen             15 min
              close exam, review                       
              results                                  
  -------------------------------------------------------------------------

**1. Logging In**

ProctorPlatform runs as a desktop application on Windows, macOS, and
Linux. Launch the app from your desktop shortcut or Start Menu. You will
be taken to the login screen.

**Step 1** Open the ProctorPlatform desktop application.

**Step 2** Enter your proctor email address and password.

**Step 3** Click Sign In.

**Step 4** If your account has the Proctor role, you will land on the
Proctor Home screen. If you see the candidate exam screen instead,
contact your administrator --- your role may be set incorrectly.

> **⚠ Your session expires after 8 hours of inactivity. You will be
> asked to log in again. Any unsaved question drafts will be lost ---
> save drafts frequently.**
>
> ✔ The Proctor Home shows a summary of your question count, active
> templates, and any exams scheduled for today. Use it as your daily
> starting point.

**2. Creating Questions**

All questions live in the Question Bank. You must create and publish
questions before you can add them to a template. Questions are reusable
--- one question can appear in multiple templates.

**2.1 Opening the Question Bank**

**Step 1** From the top navigation bar, click Question Bank.

**Step 2** You will see a list of all your existing questions (empty if
this is your first time).

**Step 3** Click the + Add Question button in the top-right corner to
open the Question Editor.

**2.2 Setting Question Metadata**

Every question --- regardless of type --- requires the following
metadata fields before you can save it:

  ------------------------------------------------------------------------
  **Field**        **What to Enter**                       **Required?**
  ---------------- --------------------------------------- ---------------
  Question Type    Choose one: MCQ Single Answer, MCQ      Yes
                   Multiple Answer, Descriptive, or        
                   Programming                             

  Topic            Select from the topic tree (e.g. Data   Yes
                   Structures \> Sorting). Ask your admin  
                   to add topics if yours is missing.      

  Difficulty       Easy, Medium, or Hard. This controls    Yes
                   how the random paper generator balances 
                   your exam.                              

  Marks            Number of marks for a correct answer.   Yes
                   Can be a decimal (e.g. 0.5). Default is 
                   1.                                      

  Tags             Comma-separated keywords (e.g. \'graph, No
                   bfs, shortest-path\'). Used for precise 
                   filtering in templates.                 

  Explanation      The correct answer explanation shown to No
                   candidates after the exam ends. Useful  
                   for learning.                           
  ------------------------------------------------------------------------

**2.3 Creating an MCQ Question**

**Step 1** Select MCQ Single Answer (one correct) or MCQ Multiple Answer
(several correct) from the Question Type field.

**Step 2** Type your question text in the Question Body editor. You can
use bold, italic, bullet lists, and insert images by clicking the image
icon.

**Step 3** To add a code snippet inside the question, click the Code
Block button in the editor toolbar and paste your code.

**Step 4** Scroll to the Answer Options section. You will see two blank
option rows to start.

**Step 5** Type each option text in its input field.

**Step 6** Toggle the Correct switch to ON for the correct option(s).
For MCQ Single, only one option can be marked correct. For MCQ Multiple,
mark all that apply.

**Step 7** Click + Add Option to add more choices (up to 8 options
allowed).

**Step 8** To reorder options, drag the handle on the left side of each
option row.

**Step 9** Turn on Shuffle Options if you want the order randomised
differently for each candidate.

**Step 10** Click Publish to make this question available in templates,
or Save Draft to keep it private for now.

> ✔ Mark at least 4 options for MCQ questions. Questions with only 2
> options are easy to guess and reduce exam validity.
>
> ❌ Do not close the editor tab before clicking Save Draft or Publish.
> Unsaved work will be lost.

**2.4 Creating a Descriptive Question**

**Step 1** Select Descriptive from the Question Type field.

**Step 2** Type your question prompt in the Question Body editor.

**Step 3** In the Marking Rubric field, write the key points the
evaluator should look for. This is private --- candidates cannot see it.

**Step 4** Set a Minimum Words and Maximum Words limit if required.
Leave blank for no limit.

**Step 5** Set Evaluation Type to Manual. A proctor grades the answer
after the exam ends using the marking rubric.

**Step 6** Click Publish or Save Draft.

**2.5 Creating a Programming Question**

Programming questions have the most configuration. Work through each
sub-section carefully.

**Problem Statement**

**Step 1** Enter the problem title in the Question Body editor.

**Step 2** Write a clear problem description including the task, input
format, output format, and any constraints (e.g. 1 \<= N \<= 100000).

**Step 3** Use the editor\'s Code Block for any example inputs/outputs
shown in the problem statement itself.

**Language Settings**

**Step 4** Under Allowed Languages, tick every language candidates may
use (Python, JavaScript, Java, C++, Go).

**Step 5** Set a Time Limit (seconds) for each language. Java and C++
typically need slightly more time than Python or JavaScript for the same
algorithm. A recommended starting point is Python: 5s, JavaScript: 5s,
Java: 10s, C++: 5s.

**Step 6** Set the Memory Limit in MB. Default is 256 MB which covers
most problems.

**Starter Code**

**Step 7** Click each language tab (Python, JavaScript, etc.) and write
the boilerplate code that candidates will see when they open the editor.
Include function signatures or class stubs so candidates know the
expected structure.

**Test Cases**

**Step 8** Scroll to the Test Cases section. Click + Add Test Case to
add a row.

**Step 9** In the Input column, type the exact input your program will
receive via stdin.

**Step 10** In the Expected Output column, type the exact expected
stdout output.

**Step 11** Set Weight (%) --- each test case contributes this
percentage to the score. All weights must add up to 100.

**Step 12** Toggle Is Hidden: ON for test cases used for final scoring
only (candidates do not see these). Toggle OFF for sample cases visible
to candidates during the exam.

**Step 13** Add at least 2 visible and 3 hidden test cases. More hidden
cases = more accurate scoring.

**Reference Solution**

**Step 14** In the Reference Solution section, select a language and
paste a correct, working solution.

**Step 15** Click Run Solution. The system will execute your solution
against all test cases. All must pass before you can publish.

> ❌ You cannot publish a programming question unless the reference
> solution passes all test cases. This ensures your test cases are
> correct.
>
> ✔ Use edge cases as hidden test cases --- empty inputs, maximum
> values, negative numbers. These separate strong solutions from weak
> ones.

**2.6 Managing Existing Questions**

  -----------------------------------------------------------------------
  **Action**         **How to Do It**
  ------------------ ----------------------------------------------------
  Search questions   Use the search bar at the top of the Question Bank.
                     It searches question text and tags.

  Filter by type /   Use the filter sidebar on the left. Select one or
  difficulty         more types and difficulty levels.

  Edit a question    Click the pencil icon in the Actions column of the
                     question list.

  Duplicate a        Click the copy icon. A draft copy opens --- useful
  question           for creating question variations.

  Archive a question Click the bin icon. Archived questions are hidden
                     from templates but not deleted. Questions used in
                     past exams are preserved.

  Bulk-tag questions Tick the checkbox on multiple rows, then click Bulk
                     Tag in the toolbar above the list.

  Export question    Click Export CSV in the toolbar to download a
  list               spreadsheet of all your questions.
  -----------------------------------------------------------------------

**2.7 Viewing Question Version History**

Every time you save or publish a question, the system creates a
versioned snapshot. This gives you a full audit trail and the ability to
restore earlier versions.

**Step 1** Open any question in the Question Editor (click the pencil
icon from the Question Bank list).

**Step 2** Click the **History** button (clock icon) in the editor
toolbar. A History drawer opens on the right side of the screen.

**Step 3** The drawer lists every saved version in reverse chronological
order:

  -----------------------------------------------------------------------
  **Column**      **What It Shows**
  --------------- -------------------------------------------------------
  Version         Version number (v1, v2, v3 ...) starting from the
                  first save.

  Date & Time     When this version was saved or published.

  Saved By        The proctor account that made the change.

  Changes         A summary of which fields changed (e.g. \'Question
                  body, Correct answer\').

  Status          Draft or Published at the time of this version.
  -----------------------------------------------------------------------

**Step 4** Click **Preview** on any row to view that version\'s full
content side by side with the current version. Differences are
highlighted.

**Step 5** To restore a prior version, click **Restore** on that row. A
new version is created containing the restored content --- the history
is never overwritten.

**Step 6** Close the drawer to return to editing the current version.

> ✔ Questions used in past exams are permanently linked to the version
> that was active at the time the exam ran. Restoring a question does
> not affect historical exam records.
>
> ✔ The current version number is shown as a small badge (e.g. v4) in
> the Question Bank list, in the Version column.

**2.8 Importing Questions in Bulk**

Instead of creating questions one at a time, you can import a large set
of questions from a file. This is useful when migrating from another
platform or when questions have been authored offline.

**Supported Formats**

  -----------------------------------------------------------------------
  **Format**              **Notes**
  ----------------------- -----------------------------------------------
  Moodle XML              Exports from Moodle 3.x and 4.x. Supports MCQ
                          Single, MCQ Multiple, and Short Answer
                          (imported as Descriptive).

  QTI 2.1                 Industry-standard format. Supported by most
                          LMS and authoring tools.

  ProctorPlatform CSV     The same CSV exported from the Question Bank
                          (Export CSV). Use this format to bulk-edit and
                          re-import questions.
  -----------------------------------------------------------------------

**Import Steps**

**Step 1** From the Question Bank screen, click **Import Questions** in
the toolbar (next to Export CSV).

**Step 2** In the Import Wizard that opens, click **Choose File** and
select your file. The system detects the format automatically.

**Step 3** A preview table appears showing all parsed questions. Each
row shows the question type, a short excerpt, and any validation errors
highlighted in red (e.g. missing correct answer, unrecognized question
type).

**Step 4** In the **Topic Mapping** panel, match each topic or category
from your import file to a topic in your platform topic tree. Topics
that already match by name are auto-mapped.

**Step 5** Review the list and uncheck any questions you do not want to
import.

**Step 6** Set **Import Status**:

-   **Draft** --- All imported questions are saved as drafts. You review
    and publish each one individually. Recommended for first-time
    imports.

-   **Published** --- All valid questions are published immediately and
    available in templates. Use only when you have already reviewed the
    source file carefully.

**Step 7** Click **Start Import**. A progress indicator runs while the
system processes each question.

**Step 8** When complete, an **Import Report** is shown:

-   X questions imported successfully

-   Y questions skipped (with reason for each: e.g. \'No correct
    answer\', \'Programming type not supported in this format\')

Click **View Imported Questions** to open a filtered Question Bank view
showing only the newly imported questions.

> ❌ Programming questions cannot be imported via file --- they require
> test cases and a reference solution that cannot be represented in
> standard import formats. Create programming questions manually.
>
> ✔ After a bulk import, use the filter sidebar to show only Draft
> questions and review them one by one before publishing.

**3. Building a Question Paper Template**

A template is the blueprint for your exam paper. It defines how many
questions to include, from which topics, at which difficulty levels, and
how they are randomised. When a candidate starts an exam, the system
uses the template to generate a unique paper for them automatically.

> **⚠ You must have published questions in the Question Bank before
> building a template. A template with empty pools cannot generate
> papers.**

**3.1 Creating a New Template**

**Step 1** From the top navigation bar, click Templates.

**Step 2** Click + New Template.

**Step 3** Fill in the Template Metadata fields:

  -----------------------------------------------------------------------
  **Field**           **What to Enter**
  ------------------- ---------------------------------------------------
  Template Name       A clear internal name, e.g. \'Python Fundamentals
                      Mid-Term v1\'. Candidates do not see this name.

  Subject             The subject this template is for (e.g. Computer
                      Science).

  Duration (minutes)  How long candidates get to complete the exam. Can
                      be overridden per exam.

  Passing Score (%)   The minimum percentage needed to pass. Default is
                      40%.

  Instructions        Text shown to candidates on the exam lobby screen
                      before they start. Include rules, permitted
                      materials, and any special instructions.

  Shuffle Sections    Turn ON to randomise the order sections appear for
                      each candidate.
  -----------------------------------------------------------------------

**3.2 Adding Sections**

A section groups related questions together (e.g. \'Part A --- Theory
MCQ\', \'Part B --- Coding\'). Every template needs at least one
section.

**Step 1** In the Sections panel on the left, click + Add Section.

**Step 2** Click the new section to select it. Its configuration will
appear in the main panel.

**Step 3** Enter the Section Name (e.g. Part A --- Multiple Choice).

**Step 4** Optionally enter Section Instructions shown to candidates
before this section.

**Step 5** Set options for this section:

-   Shuffle Questions --- ON randomises question order within this
    section per candidate

-   Negative Marking --- turn ON if wrong answers deduct marks, then
    enter the Penalty Fraction (e.g. 0.25 means a wrong answer costs 25%
    of the question\'s marks)

**Step 6** Repeat for each section you need. Use the drag handles to
reorder sections.

**3.3 Adding Selection Rules**

A Selection Rule tells the system which questions to randomly pick for a
section. Each section can have multiple rules --- for example, one rule
to pick Easy questions and another to pick Hard questions from the same
section.

**Step 1** With a section selected, click + Add Rule inside the section
configuration panel.

**Step 2** Configure the rule fields:

  ------------------------------------------------------------------------
  **Rule Field**   **What to Enter**        **Example**
  ---------------- ------------------------ ------------------------------
  Question Type    The type of question for MCQ Single Answer
                   this rule                

  Topic(s)         Select one or more       Data Structures \> Arrays,
                   topics from the tree.    Data Structures \> Linked
                   Questions must belong to Lists
                   at least one of the      
                   selected topics.         

  Difficulty       Select one or more       Easy, Medium
                   difficulty levels to     
                   draw from                

  Tags (optional)  Questions must have ALL  sorting
                   the tags you enter here. 
                   Leave blank to ignore    
                   tags.                    

  Min / Max Marks  Filter questions to a    Min: 1, Max: 2
                   specific marks range.    
                   Leave blank for no       
                   filter.                  

  Count            How many questions to    5
                   randomly pick from the   
                   pool that matches the    
                   above filters            

  Allow Repeats    Leave OFF unless you     OFF
                   want candidates to       
                   potentially see the same 
                   question in retake exams 
  ------------------------------------------------------------------------

**Step 3** After filling in the rule, check the Pool Preview badge below
the rule. It shows how many questions currently match your filters (e.g.
\'23 questions match this rule\').

**Step 4** If the pool count is less than the Count you requested, a red
warning appears. You must either create more questions or relax your
filters.

**Step 5** To always include specific questions regardless of random
selection, click the Pool Preview badge and tick Pin next to those
questions.

**Step 6** To permanently exclude a question from this rule\'s pool,
click Exclude next to it.

**Step 7** Repeat --- add more rules to the same section or move to the
next section.

> ✔ Keep your pool at least 3x larger than the count you need. A pool of
> 30 questions for a count of 10 gives good randomisation diversity
> between candidates.

**3.4 Reviewing the Summary Sidebar**

The Summary Sidebar on the right updates in real time as you build.
Before publishing, verify:

-   Total Questions matches your expected paper length

-   Total Marks matches your intended maximum score

-   Pool Health is green for all rules --- no red warnings

-   Difficulty breakdown shows the Easy / Medium / Hard ratio you
    intended

**3.5 Previewing the Generated Paper**

**Step 1** Click Preview Paper in the bottom action bar.

**Step 2** The system runs the randomisation algorithm and renders a
sample paper exactly as a candidate would receive it.

**Step 3** Click Generate New Paper to see a different random selection.
Each click produces a fresh paper.

**Step 4** Check that question wording is clear, marks are correct, and
no question feels out of place.

**Step 5** When satisfied, close the preview and return to the template
editor.

> ✔ Generate at least 3 different preview papers before publishing. This
> catches edge cases where a bad combination of questions could occur.

**3.6 Publishing the Template**

**Step 1** Click Publish Template in the bottom action bar.

**Step 2** The system validates that all rules have sufficient pool
sizes. If any rule fails, fix it before proceeding.

**Step 3** The template status changes from Draft to Active. It is now
available to assign to exams.

> ❌ Once a template is used in a live or closed exam, you cannot delete
> it. You can archive it to hide it from new exams.

**4. Scheduling an Exam**

An exam is a timed event that ties a template to a group of candidates.
Candidates can only enter the exam within the scheduled window.

**4.1 Creating the Exam**

**Step 1** From the top navigation bar, click Exams.

**Step 2** Click + New Exam.

**Step 3** Fill in the exam details:

  -----------------------------------------------------------------------
  **Field**           **What to Enter**
  ------------------- ---------------------------------------------------
  Exam Title          The name candidates will see, e.g. \'Python
                      Fundamentals --- Mid-Term Exam, Feb 2026\'.

  Template            Select the active template you built in Stage 2.

  Start Date & Time   The earliest time candidates can enter. Use 24-hour
                      format. Set at least 15 minutes in the future.

  End Date & Time     The hard deadline. All exams are automatically
                      submitted at this time, even if a candidate is
                      still answering.

  Duration Override   Leave blank to use the template\'s default
                      duration. Enter a number here to override it for
                      this specific exam.

  Max Attempts        How many times a candidate can take this exam.
                      Default is 1. Set to 2 or 3 for practice exams.

  Proctoring Level    None (no monitoring) or Camera Only (live camera
                      feed with face detection, no recording).

  Randomise Paper     Leave ON to give each candidate a different random
                      paper. Turn OFF only if you want all candidates to
                      see identical questions.
  -----------------------------------------------------------------------

**4.2 Enrolling Candidates**

Choose one of two enrolment methods:

**Option A --- Open Enrolment**

**Step 1** Set Enrolment Mode to Open.

**Step 2** Click Save & Get Link.

**Step 3** Share the exam link with candidates. Anyone with the link and
a valid account can join.

**Option B --- Invite Only (Recommended for Formal Exams)**

**Step 1** Set Enrolment Mode to Invite Only.

**Step 2** Click Upload Candidate List.

**Step 3** Upload a CSV file with one candidate email per row. The
system will send each candidate an invitation email with their exam link
and start time.

**Step 4** The enrolled candidate list appears in the table below. You
can add or remove individual candidates using the + Add Candidate and
Remove buttons.

**4.2.1 Setting Per-Candidate Accommodations**

Each candidate row in the list has an **Edit Accommodation** action
(pencil-and-clock icon). Use this to pre-configure adjustments that
apply automatically when that candidate's exam starts --- no live action
needed.

  -----------------------------------------------------------------------
  **Accommodation Field**  **What to Enter**
  ------------------------ ----------------------------------------------
  Extra Time (minutes)     Additional minutes added on top of the exam
                           duration for this candidate only. E.g. 30 for
                           a 50% time extension on a 60-minute exam.

  Allowed Breaks           Number of permitted breaks and the maximum
                           duration of each (in minutes). The timer
                           pauses during an approved break.

  Custom Instructions      Text shown only to this candidate as an
                           overlay at exam start. Use for individual
                           clarifications or permitted materials.
  -----------------------------------------------------------------------

When an accommodation is set, the candidate's row shows an
**Accommodation Applied** badge. The same badge appears in the Candidate
Detail Drawer in the Live Monitor so you know at a glance which
candidates have adjusted conditions.

Accommodation details are included in the exam PDF report in a dedicated
column next to each candidate's result row.

> ✔ Set accommodations before publishing the exam. You can still add or
> edit them after publishing as long as the exam has not yet started.
>
> ❌ You cannot change accommodations once a candidate has entered the
> exam.

> ✔ Send candidates a reminder email 24 hours and 1 hour before the exam
> start time using the Send Reminder button on the exam detail page.

**4.3 Publishing the Exam**

**Step 1** Review all exam details carefully. Pay special attention to
start and end times.

**Step 2** Click Publish Exam. The status changes to Scheduled.

**Step 3** Candidates who are enrolled will now see the exam listed in
their dashboard when they log in.

> ❌ Once published, you cannot change the template assigned to an exam.
> To change the template, create a new exam.
>
> **⚠ You can edit the start/end time, duration, and candidate list
> after publishing, as long as the exam has not yet started.**

**4.4 Configuring Automated Reminders**

Instead of manually clicking Send Reminder, you can configure the system
to send reminder emails automatically at set intervals before the exam.

**Step 1** On the New Exam form (or on the exam detail page before the
exam starts), scroll to the **Reminder Schedule** section.

**Step 2** Toggle **Auto-send reminders** to ON.

**Step 3** The default reminder triggers are:

-   48 hours before start

-   24 hours before start

-   1 hour before start

-   15 minutes before start

Enable or disable each trigger individually using its toggle.

**Step 4** To customize the email body for a trigger, click **Edit
Message** next to it. You can use the following template variables in
the message:

  -----------------------------------------------------------------------
  **Variable**        **Replaced With**
  ------------------- ---------------------------------------------------
  {candidate\_name}   The candidate\'s full name

  {exam\_title}       The exam title as configured in the Exam Title field

  {start\_time}       The exam start date and time in the candidate\'s
                      local timezone

  {duration}          The exam duration in minutes (including any
                      accommodation extra time for that candidate)

  {exam\_link}        The candidate\'s unique exam entry link
  -----------------------------------------------------------------------

**Step 5** Click **Save Reminder Schedule**. The system will queue and
send emails at the correct times automatically.

**Step 6** To review reminder status after saving, open the exam detail
page and scroll to the **Reminder Log** panel. It shows each scheduled
trigger with a status badge:

-   **Pending** --- scheduled but not yet sent

-   **Sent** --- delivered successfully (with timestamp)

-   **Failed** --- delivery error (hover for reason; resend manually if
    needed)

> ✔ Reminders are sent to candidates regardless of enrolment mode (Open
> or Invite Only). If a candidate was added after the 48h reminder
> already fired, only the remaining triggers will send to them.
>
> ✔ You can still use the manual **Send Reminder** button at any time,
> even with auto-reminders enabled --- it sends immediately to all
> enrolled candidates.

**5. Monitoring the Live Exam**

Once the exam start time is reached and candidates begin entering, the
Live Monitor becomes your primary workspace. Stay on this screen for the
duration of the exam.

**5.1 Opening the Live Monitor**

**Step 1** From the Exams screen, find your running exam (it will have a
green Live badge).

**Step 2** Click Monitor to open the Live Monitor screen.

**5.2 Understanding the Candidate Grid**

Each candidate is shown as a tile in the grid. The tile updates in real
time via live data feed.

  -----------------------------------------------------------------------
  **Tile Element**    **What It Means**
  ------------------- ---------------------------------------------------
  Camera thumbnail    Live view from the candidate\'s webcam. Updates
                      every few seconds.

  Name + progress     Candidate name and how many questions they have
                      answered (e.g. \'7 / 20 answered\').

  Status badge        Active = currently answering. Idle = no activity
                      for \> 2 min. Submitted = finished. Disconnected =
                      app closed or lost connection.

  Violation count     Red number in the top-right corner. Shows total
  badge               violations detected for this candidate.

  Green border        No violations detected. Everything normal.

  Amber border        1--2 low or medium violations detected (e.g. brief
                      tab switch, face looked away).

  Red border          High-severity violation detected (multiple faces,
                      devtools opened, camera offline).

  Grey border         Candidate has submitted or not yet started.
  -----------------------------------------------------------------------

**5.3 Investigating a Candidate**

**Step 1** Click any candidate tile to open the Candidate Detail Drawer
on the right side of the screen.

**Step 2** The drawer shows: enlarged live camera feed, full violation
log with timestamps, progress details, and available actions.

**Step 3** Review the violation log entries. Click any entry that has a
camera icon to see the frame captured at the moment of the violation.

**5.4 Taking Action on a Candidate**

From the Candidate Detail Drawer, you have the following actions
available:

  -----------------------------------------------------------------------
  **Action**    **When to Use It**  **Effect**
  ------------- ------------------- -------------------------------------
  Send Message  To clarify an exam  A text overlay appears on the
                question or give a  candidate\'s screen for 30 seconds.
                non-urgent notice   They cannot dismiss it early.
                to one candidate    

  Send Warning  When a              A modal appears on the candidate\'s
                medium-severity     screen. They must click \'I
                violation has       Understand\' to dismiss it. This is
                occurred and the    logged as a formal warning.
                candidate needs a   
                formal caution      

  Extend Time   If a candidate had  Adds extra minutes to that
                a genuine technical candidate\'s individual timer only.
                issue or disruption Enter the number of minutes in the
                                    popup.

  Terminate     If a candidate is   Their exam is force-submitted
  Exam          clearly cheating or immediately with a Terminated flag on
                you need to remove  their record. This cannot be undone.
                them from the exam  
  -----------------------------------------------------------------------

> ❌ Terminate Exam is irreversible. The candidate will not be able to
> re-enter. Only use this for serious, confirmed violations.

**5.5 Sending a Broadcast Message**

**Step 1** Click Broadcast Message in the control ribbon at the top of
the monitor screen.

**Step 2** Type your message in the text box (e.g. \'There is a typo in
Question 4 --- please read the corrected version: \...\'\').

**Step 3** Click Send to All. The message appears as a banner on every
active candidate\'s screen simultaneously for 30 seconds.

> ✔ Use Broadcast Message sparingly. Multiple interruptions during the
> exam are disruptive. Reserve it for genuine clarifications or time
> announcements.

**5.6 Using Bulk Actions**

For exams with many candidates, you can act on multiple candidates at
once instead of opening each drawer individually.

**Step 1** Click **Select** in the control ribbon at the top of the
monitor screen. Each candidate tile now shows a checkbox in its
top-left corner.

**Step 2** Click tiles to select candidates, or use **Select All** /
**Deselect All** in the control ribbon.

**Step 3** When 2 or more candidates are selected, a **Bulk Action Bar**
appears at the bottom of the screen with the following actions:

  -----------------------------------------------------------------------
  **Bulk Action**            **Effect**
  -------------------------- --------------------------------------------
  Send Message to Selected   Opens a shared message composer. The message
                             is sent to all selected candidates as an
                             overlay on their screens simultaneously.

  Send Warning to Selected   Sends a formal warning modal to all selected
                             candidates. Each must click \'I Understand\'
                             to dismiss. A warning is logged individually
                             on each candidate\'s record.

  Export Violation Logs      Downloads a CSV file containing the full
                             violation log for all selected candidates,
                             timestamped and labelled by severity.
  -----------------------------------------------------------------------

**Step 4** Click **Exit Select Mode** in the control ribbon when done.
The grid returns to normal.

> ✔ Use bulk Send Warning when you observe the same violation (e.g. a
> widespread tab-switch event) across multiple candidates at once ---
> faster than handling them one by one.
>
> ❌ Terminate Exam is not available as a bulk action. Termination must
> always be done individually, per candidate, to prevent accidental
> mass-termination.

**5.7 Watching the Violation Feed**

The Violation Feed on the right panel shows a real-time stream of all
violations across all candidates, newest at the top. High-severity
violations play an audio ping (you can mute this using the bell icon at
the top of the feed). Use the filter bar to show only High severity
violations if the feed is busy.

**5.8 Ending the Exam**

The exam ends automatically when the End Date & Time is reached. All
remaining candidate exams are submitted automatically. You do not need
to do anything.

To end the exam early for all candidates:

**Step 1** Click End Exam Early in the control ribbon.

**Step 2** Confirm in the popup. All active candidate exams are
immediately force-submitted.

**Step 3** The exam status changes to Ended.

> ❌ Ending the exam early is irreversible. Candidates who have not
> finished will lose any unanswered questions. Only do this in an
> emergency.

**6. Reviewing Results & Grading**

**6.1 Accessing Results**

**Step 1** From the Exams screen, find your completed exam (status:
Ended or Closed).

**Step 2** Click View Results.

**Step 3** The Results screen shows a ranked table of all candidates
with their total score, percentage, and pass/fail status.

**6.2 Understanding Auto-Graded Scores**

-   MCQ questions: graded automatically. Score is instant.

-   Programming questions: graded automatically by test case results.
    Score is instant.

-   Descriptive questions: require manual grading. They show as Pending
    until graded.

**6.3 Grading Descriptive Answers**

**Step 1** On the Results screen, click the Pending Grades button to see
all ungraded descriptive answers.

**Step 2** Click a candidate row to open their answer.

**Step 3** The marking rubric you wrote when creating the question is
shown in a panel on the right.

**Step 4** Enter a mark (0 to the question\'s maximum marks) in the
Score field.

**Step 5** Optionally enter written Feedback for the candidate.

**Step 6** Click Save Grade. The candidate\'s total score updates
immediately.

**6.4 Publishing Results to Candidates**

**Step 1** Once all descriptive answers are graded, click Publish
Results.

**Step 2** Candidates will receive an email notification and can view
their score, question-by-question breakdown, and any feedback when they
log in.

**Step 3** The exam status changes to Closed.

> **⚠ You cannot unpublish results once they are published. Ensure all
> grading is finalised before clicking Publish Results.**

**6.5 Downloading the Exam Report**

**Step 1** On the Results screen, click Download Report.

**Step 2** A PDF report is generated containing: full results table,
violation summary per candidate, difficulty analysis, and question-level
statistics.

**Step 3** The report is also emailed to your proctor account
automatically.

**6.6 Reviewing Item Analysis**

Item Analysis gives you statistical insight into each question's quality
and difficulty based on real candidate responses. Use it to improve your
question bank over time.

**Step 1** On the Results screen, click the **Item Analysis** tab (next
to the Results table tab).

**Step 2** A table appears listing every question in the exam with the
following columns:

  ------------------------------------------------------------------------
  **Column**           **What It Shows**
  -------------------- ---------------------------------------------------
  Difficulty Index     Percentage of candidates who answered this question
  (P-value)            correctly. Higher = easier. Below 0.2 or above 0.9
                       may indicate a flawed or trivially easy question.

  Discrimination       Correlation between a candidate\'s score on this
  Index                question and their total exam score. Positive = good
                       discriminator. Near 0 or negative = poor question.

  Option Breakdown     (MCQ only) A mini bar chart showing what percentage
  Analysis             of candidates selected each option. Ideal wrong
                       options attract 10--30% of incorrect responses.

  Avg Time Spent       Mean time (in seconds) candidates spent on this
                       question before moving on.
  ------------------------------------------------------------------------

**Step 3** Questions are color-coded automatically:

-   **Green** --- Well-performing question. Keep as is.

-   **Amber** --- Borderline. Review question wording or wrong options.

-   **Red** --- Likely flawed. Discrimination index is poor or difficulty
    index is extreme. Review and revise before reuse.

**Step 4** To flag a question for revision, click **Flag for Review** in
its row. The question will appear in the Question Bank with a **Review
Needed** badge, visible to all proctors with access to that bank.

**Step 5** To remove a flag, open the question in the Question Editor
and click **Clear Review Flag**.

> ✔ Aim for a Discrimination Index above 0.3 for most questions. Values
> below 0.1 suggest the question is not separating strong from weak
> candidates.
>
> ✔ The Item Analysis data is also included as a summary table in the
> PDF report generated by Download Report (section 6.5).

**7. Tips & Best Practices**

**7.1 Building a High-Quality Question Bank**

-   Write question stems that are clear and unambiguous. Avoid double
    negatives.

-   For MCQ, make all distractors (wrong options) plausible. Obvious
    wrong answers reduce the exam\'s discriminating power.

-   Add at least 5 hidden test cases per programming problem. Use
    boundary values and edge cases.

-   Tag questions consistently. Tags are your primary tool for
    fine-grained template rules.

-   Duplicate and vary questions instead of creating entirely new ones
    --- it speeds up question bank growth.

**7.2 Template Design**

-   Start with a rough paper structure on paper before opening the
    Template Builder.

-   Keep pool sizes at least 3x the required count for meaningful
    randomisation.

-   Use multiple small rules rather than one large rule to control topic
    distribution precisely.

-   Test your template with at least 5 preview papers before the exam
    day.

-   Version your templates: create a new template (e.g. v2) when making
    significant changes rather than editing a live one.

**7.3 Exam Day**

-   Open the Live Monitor 15 minutes before the exam start time.

-   Keep the violation feed filtered to High severity only during busy
    exams --- low-severity events can be reviewed post-exam.

-   If the internet connection drops for a candidate, wait 60 seconds.
    The app reconnects automatically in most cases.

-   Brief tab switches (under 5 seconds) are often accidental. Reserve
    formal warnings for repeated or deliberate behaviour.

-   Do not close the Live Monitor tab during the exam --- you will lose
    the real-time feed.

**7.4 Common Mistakes to Avoid**

  ------------------------------------------------------------------------
  **Mistake**         **Consequence**       **How to Avoid**
  ------------------- --------------------- ------------------------------
  Publishing a        All candidates get    Keep pool at least 3x larger
  template with pool  the same paper --- no than count
  sizes equal to the  randomisation         
  required count                            

  Forgetting to set   Question cannot be    Always toggle at least one
  correct answers on  published;            option as Correct
  MCQ options         auto-grading will     
                      fail                  

  Setting end time    Candidates are cut    Add at least 30 min buffer
  without enough      off mid-exam          beyond expected completion
  margin                                    time

  Not testing the     System rejects the    Always click Run Solution and
  reference solution  question at publish   confirm all tests pass
  before publishing   time                  

  Using the same      Candidates who retake Expand the pool or create a
  template version    may remember the same new template version for
  for retake exams    questions if the pool retakes
                      is small              
  ------------------------------------------------------------------------

**8. Troubleshooting**

  ------------------------------------------------------------------------
  **Problem**        **Likely Cause**    **Solution**
  ------------------ ------------------- ---------------------------------
  Template shows red New questions are   Go to Question Bank, find the
  pool warning after in Draft status,    questions, click Publish on each
  publishing         not Published       one
  questions                              

  Candidate shows    App closed or       Wait 60 seconds --- app
  Disconnected in    internet dropped    reconnects automatically. If
  monitor                                still disconnected after 2 min,
                                         contact the candidate directly.

  Code submission    Execution worker    Refresh the submission status. If
  stuck on Queued    queue is backed up  still queued after 5 min, notify
  for \> 2 minutes                       your system administrator.

  Camera thumbnail   Candidate denied    Send a message asking them to
  shows blank /      camera permission   restart the app and allow camera
  black              or camera hardware  access. If they cannot, consider
                     issue               switching to Camera Only or None
                                         proctoring for that candidate.

  Cannot publish a   Validation errors   Scroll to the top of the Question
  question           --- check for       Editor --- error messages appear
                     missing required    highlighted in red next to each
                     fields              missing field

  Exam status stuck  Start time is in    Edit the exam and set a future
  on Draft after     the past            start time, then republish
  clicking Publish                       

  Results show 0     Reference solution  Review test cases in the Question
  marks for a        was incorrect ---   Editor. Correct and republish.
  programming        test cases may be   Contact admin to re-run grading
  question           wrong               for affected submissions.
  ------------------------------------------------------------------------

**9. Quick Reference Cheat Sheet**

  ------------------------------------------------------------------------
  **Task**            **Navigate To**          **Key Button**
  ------------------- ------------------------ ---------------------------
  Create a question   Question Bank            \+ Add Question

  Edit a question     Question Bank \>         Pencil icon
                      question row             

  Build a new         Templates                \+ New Template
  template                                     

  Preview a generated Templates \> template    Preview Paper
  paper               row \> open              

  Publish a template  Template Editor          Publish Template (bottom
                                               bar)

  Schedule a new exam Exams                    \+ New Exam

  Enrol candidates    Exams \> exam row \>     Upload Candidate List
                      open                     

  Open live monitor   Exams \> Live exam row   Monitor

  Send message to one Monitor \> click         Send Message (in drawer)
  candidate           candidate tile           

  Broadcast to all    Live Monitor (top        Broadcast Message
  candidates          ribbon)                  

  Extend a            Monitor \> click         Extend Time (in drawer)
  candidate\'s time   candidate tile           

  Grade descriptive   Exams \> ended exam \>   Pending Grades
  answers             Results                  

  Publish results to  Exams \> ended exam \>   Publish Results
  candidates          Results                  

  Download exam PDF   Exams \> closed exam \>  Download Report
  report              Results

  Import questions    Question Bank            Import Questions
  from file

  View question       Question Bank \>         History (clock icon)
  version history     question row \> open

  Set candidate       Exams \> exam row \>     Edit Accommodation
  accommodations      Candidates tab           (pencil-and-clock icon)

  Configure auto      Exams \> New Exam or     Reminder Schedule section
  reminders           exam detail page

  Bulk action on      Live Monitor (top        Select, then Bulk Action
  multiple candidates ribbon)                  Bar

  View item analysis  Exams \> closed exam \>  Item Analysis tab
                      Results

  Flag question for   Results \> Item          Flag for Review
  review              Analysis tab
  ------------------------------------------------------------------------

*End of Document --- ProctorPlatform Proctor Operations Manual v2.0*