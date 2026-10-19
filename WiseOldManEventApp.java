import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.prefs.BackingStoreException;
import java.util.prefs.Preferences;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Small desktop form for creating a group competition on Wise Old Man. */
public class WiseOldManEventApp {
    private static final Color INK = new Color(34, 39, 46);
    private static final Color MUTED = new Color(105, 112, 122);
    private static final Color ACCENT = new Color(62, 112, 91);
    private static final Preferences SETTINGS = Preferences.userRoot().node("WiseOldManEventCreator");
    private final JFrame frame = new JFrame("WiseOldMan Event Creator - Made by Its Za");
    private final JTabbedPane tabs = new JTabbedPane();
    private final JTextField title = new JTextField("Clan Event");
    private final JComboBox<EventCategory> category = new JComboBox<>(EventCategory.values());
    private final JComboBox<MetricOption> subcategory = new JComboBox<>();
    private final JTextField groupId = new JTextField(SETTINGS.get("groupId", ""));
    private final JPasswordField verificationCode = new JPasswordField(SETTINGS.get("verificationCode", ""));
    private final JTextField configGroupId = new JTextField(SETTINGS.get("groupId", ""));
    private final JPasswordField configVerificationCode = new JPasswordField(SETTINGS.get("verificationCode", ""));
    private final JLabel configStatus = new JLabel("Settings are saved for this Windows user.");
    private final DateTimePicker startsAt = new DateTimePicker(defaultDateTime(0));
    private final DateTimePicker endsAt = new DateTimePicker(defaultDateTime(7));
    private final JButton createButton = new JButton("Create event");
    private final JLabel status = new JLabel("Your group code stays on this computer and is sent only to Wise Old Man.");
    private final DefaultListModel<String> pickerModel = new DefaultListModel<>();
    private final JList<String> pickerList = new JList<>(pickerModel);
    private final JButton spinButton = new JButton("Spin for event type");
    private final JButton useResultButton = new JButton("Use this event");
    private final JLabel wheelStatus = new JLabel("Spin once to choose Skill of the Week or Boss of the Week.");
    private EventCategory wheelCategory;
    private int wheelStage = 0;

    private WiseOldManEventApp() {
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.setMinimumSize(new Dimension(720, 680));
        frame.setSize(760, 720);
        frame.setLocationRelativeTo(null);
        frame.setContentPane(buildTabbedContent());
        category.addActionListener(e -> refreshSubcategories());
        refreshSubcategories();
        createButton.addActionListener(e -> createCompetition());
        spinButton.addActionListener(e -> spin());
        useResultButton.addActionListener(e -> tabs.setSelectedIndex(0));
        frame.setVisible(true);
    }

    private JPanel buildTabbedContent() {
        JPanel page = new JPanel(new BorderLayout());
        page.setBackground(Color.WHITE);
        tabs.addTab("Create event", buildContent());
        tabs.addTab("Pick event", buildWheelContent());
        tabs.addTab("Configuration", buildConfigurationContent());
        page.add(tabs, BorderLayout.CENTER);
        JLabel credit = new JLabel("Made by Its Za");
        credit.setFont(new Font("Segoe UI", Font.PLAIN, 10));
        credit.setForeground(MUTED);
        JPanel footer = new JPanel(new FlowLayout(FlowLayout.RIGHT, 16, 5));
        footer.setBackground(Color.WHITE);
        footer.add(credit);
        page.add(footer, BorderLayout.SOUTH);
        return page;
    }

    private JPanel buildContent() {
        JPanel root = new JPanel(new BorderLayout(0, 16));
        root.setBackground(Color.WHITE);
        root.setBorder(new EmptyBorder(28, 32, 24, 32));

        JPanel header = new JPanel();
        header.setOpaque(false);
        header.setLayout(new BoxLayout(header, BoxLayout.Y_AXIS));
        JLabel titleLabel = new JLabel("WiseOldMan Event Creator");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 25));
        titleLabel.setForeground(INK);
        JLabel subtitle = new JLabel("Set up a Wise Old Man competition from your desktop.");
        subtitle.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        subtitle.setForeground(MUTED);
        header.add(titleLabel);
        header.add(Box.createVerticalStrut(5));
        header.add(subtitle);

        JPanel fields = new JPanel(new GridBagLayout());
        fields.setOpaque(false);
        GridBagConstraints c = new GridBagConstraints();
        c.gridx = 0; c.gridy = 0; c.weightx = 1; c.fill = GridBagConstraints.HORIZONTAL;
        c.insets = new Insets(7, 0, 2, 0);
        addField(fields, c, "Event title", title);
        addField(fields, c, "Event type", category);
        addField(fields, c, "Subcategory", subcategory);
        addField(fields, c, "Clan group ID", groupId);
        addField(fields, c, "Group verification code", verificationCode);
        addField(fields, c, "Starts (local time)", startsAt);
        addField(fields, c, "Ends (local time)", endsAt);
        JLabel format = new JLabel("Pick dates from the calendar; type times like 8:00 PM or 20:00 in your local timezone.");
        format.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        format.setForeground(MUTED);
        c.gridy++; c.insets = new Insets(3, 0, 2, 0);
        fields.add(format, c);

        JPanel bottom = new JPanel(new BorderLayout(0, 12));
        bottom.setOpaque(false);
        createButton.setFont(new Font("Segoe UI", Font.BOLD, 14));
        createButton.setForeground(Color.WHITE);
        createButton.setBackground(ACCENT);
        createButton.setFocusPainted(false);
        createButton.setBorder(new EmptyBorder(12, 18, 12, 18));
        status.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        status.setForeground(MUTED);
        bottom.add(createButton, BorderLayout.NORTH);
        bottom.add(status, BorderLayout.CENTER);

        root.add(header, BorderLayout.NORTH);
        root.add(fields, BorderLayout.CENTER);
        root.add(bottom, BorderLayout.SOUTH);
        return root;
    }

    private JPanel buildWheelContent() {
        JPanel root = new JPanel(new BorderLayout(12, 18));
        root.setBackground(Color.WHITE);
        root.setBorder(new EmptyBorder(26, 30, 24, 30));
        JLabel heading = new JLabel("Pick this week’s event");
        heading.setFont(new Font("Segoe UI", Font.BOLD, 23));
        heading.setForeground(INK);
        JLabel hint = new JLabel("First choose Skill of the Week or Boss of the Week, then spin for the specific skill or boss.");
        hint.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        hint.setForeground(MUTED);
        JPanel top = new JPanel();
        top.setOpaque(false);
        top.setLayout(new BoxLayout(top, BoxLayout.Y_AXIS));
        top.add(heading);
        top.add(Box.createVerticalStrut(5));
        top.add(hint);

        JPanel wheelHolder = new JPanel(new GridBagLayout());
        wheelHolder.setOpaque(false);
        pickerList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        pickerList.setVisibleRowCount(7);
        pickerList.setFixedCellHeight(44);
        pickerList.setFont(new Font("Segoe UI", Font.PLAIN, 18));
        pickerList.setSelectionBackground(new Color(62, 112, 91));
        pickerList.setSelectionForeground(Color.WHITE);
        pickerList.setBorder(new EmptyBorder(4, 10, 4, 10));
        JScrollPane pickerScroll = new JScrollPane(pickerList);
        pickerScroll.setPreferredSize(new Dimension(520, 330));
        pickerScroll.getVerticalScrollBar().setUnitIncrement(24);
        pickerScroll.setBorder(BorderFactory.createLineBorder(new Color(216, 222, 226), 1, true));
        setPickerItems(List.of("Skill of the Week", "Boss of the Week"));
        wheelHolder.add(pickerScroll);

        JPanel controls = new JPanel(new FlowLayout(FlowLayout.CENTER, 12, 0));
        controls.setOpaque(false);
        spinButton.setFont(new Font("Segoe UI", Font.BOLD, 14));
        spinButton.setForeground(Color.WHITE);
        spinButton.setBackground(ACCENT);
        spinButton.setFocusPainted(false);
        spinButton.setBorder(new EmptyBorder(12, 18, 12, 18));
        useResultButton.setFont(new Font("Segoe UI", Font.BOLD, 14));
        useResultButton.setEnabled(false);
        controls.add(spinButton);
        controls.add(useResultButton);

        JPanel bottom = new JPanel(new BorderLayout(0, 12));
        bottom.setOpaque(false);
        wheelStatus.setHorizontalAlignment(SwingConstants.CENTER);
        wheelStatus.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        wheelStatus.setForeground(INK);
        bottom.add(wheelStatus, BorderLayout.NORTH);
        bottom.add(controls, BorderLayout.CENTER);
        root.add(top, BorderLayout.NORTH);
        root.add(wheelHolder, BorderLayout.CENTER);
        root.add(bottom, BorderLayout.SOUTH);
        return root;
    }

    private JPanel buildConfigurationContent() {
        JPanel root = new JPanel(new BorderLayout(0, 18));
        root.setBackground(Color.WHITE);
        root.setBorder(new EmptyBorder(28, 32, 24, 32));

        JLabel heading = new JLabel("Clan settings");
        heading.setFont(new Font("Segoe UI", Font.BOLD, 23));
        heading.setForeground(INK);
        JLabel description = new JLabel("Save the Wise Old Man details you use for event creation.");
        description.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        description.setForeground(MUTED);
        JPanel header = new JPanel();
        header.setOpaque(false);
        header.setLayout(new BoxLayout(header, BoxLayout.Y_AXIS));
        header.add(heading);
        header.add(Box.createVerticalStrut(5));
        header.add(description);

        JPanel fields = new JPanel(new GridBagLayout());
        fields.setOpaque(false);
        GridBagConstraints c = new GridBagConstraints();
        c.gridx = 0;
        c.gridy = 0;
        c.weightx = 1;
        c.fill = GridBagConstraints.HORIZONTAL;
        c.insets = new Insets(7, 0, 2, 0);
        addField(fields, c, "Clan group ID", configGroupId);
        addField(fields, c, "Group verification code", configVerificationCode);
        JLabel privacy = new JLabel("Saved for this Windows user in Java Preferences. The code is not encrypted.");
        privacy.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        privacy.setForeground(MUTED);
        c.gridy++;
        c.insets = new Insets(6, 0, 2, 0);
        fields.add(privacy, c);

        JButton saveButton = new JButton("Save configuration");
        saveButton.setFont(new Font("Segoe UI", Font.BOLD, 14));
        saveButton.setForeground(Color.WHITE);
        saveButton.setBackground(ACCENT);
        saveButton.setFocusPainted(false);
        saveButton.setBorder(new EmptyBorder(12, 18, 12, 18));
        saveButton.addActionListener(e -> saveConfiguration());
        configStatus.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        configStatus.setForeground(MUTED);
        JPanel bottom = new JPanel(new BorderLayout(0, 12));
        bottom.setOpaque(false);
        bottom.add(saveButton, BorderLayout.NORTH);
        bottom.add(configStatus, BorderLayout.CENTER);

        root.add(header, BorderLayout.NORTH);
        root.add(fields, BorderLayout.CENTER);
        root.add(bottom, BorderLayout.SOUTH);
        return root;
    }

    private boolean saveConfiguration() {
        String group = configGroupId.getText().trim();
        String code = new String(configVerificationCode.getPassword()).trim();
        if (group.isEmpty() || !group.matches("\\d+")) {
            showError("Enter your clan’s numeric Wise Old Man group ID.");
            return false;
        }
        if (code.isEmpty()) {
            showError("Enter your group verification code.");
            return false;
        }
        try {
            SETTINGS.put("groupId", group);
            SETTINGS.put("verificationCode", code);
            SETTINGS.flush();
            groupId.setText(group);
            verificationCode.setText(code);
            configStatus.setText("Configuration saved for this Windows user.");
            return true;
        } catch (SecurityException | BackingStoreException ex) {
            configStatus.setText("Could not save configuration: " + ex.getMessage());
            showError("Could not save configuration. " + ex.getMessage());
            return false;
        }
    }

    private void spin() {
        if (wheelStage == 2) {
            wheelStage = 0;
            wheelCategory = null;
            setPickerItems(List.of("Skill of the Week", "Boss of the Week"));
            wheelStatus.setText("Spin once to choose Skill of the Week or Boss of the Week.");
            useResultButton.setEnabled(false);
            spinButton.setText("Spin for event type");
        }
        if (spinButton.isEnabled()) {
            spinButton.setEnabled(false);
            useResultButton.setEnabled(false);
            Random random = new Random();
            if (wheelStage == 0) {
                int choice = random.nextInt(2);
                rollPickerTo(choice, () -> {
                    wheelCategory = choice == 0 ? EventCategory.SKILLS : EventCategory.BOSSES;
                    wheelStage = 1;
                    setPickerItems(Arrays.stream(wheelCategory.options).map(o -> o.label).toList());
                    wheelStatus.setText(wheelCategory == EventCategory.SKILLS
                            ? "Skill of the Week selected. Spin again to draw a skill."
                            : "Boss of the Week selected. Spin again to draw a boss.");
                    spinButton.setText("Spin for " + (wheelCategory == EventCategory.SKILLS ? "skill" : "boss"));
                    spinButton.setEnabled(true);
                });
            } else {
                int choice = random.nextInt(wheelCategory.options.length);
                MetricOption result = wheelCategory.options[choice];
                rollPickerTo(choice, () -> {
                    category.setSelectedItem(wheelCategory);
                    subcategory.setSelectedItem(result);
                    String type = wheelCategory == EventCategory.SKILLS ? "Skill of the Week" : "Boss of the Week";
                    String shortType = wheelCategory == EventCategory.SKILLS ? "SoTW" : "BoTW";
                    title.setText(shortType + " - " + result.label);
                    wheelStage = 2;
                    wheelStatus.setText("Result: " + type + " — " + result.label + ". It’s ready in Create event.");
                    useResultButton.setEnabled(true);
                    spinButton.setText("Spin again");
                    spinButton.setEnabled(true);
                });
            }
        }
    }

    private void setPickerItems(List<String> items) {
        pickerModel.clear();
        for (String item : items) pickerModel.addElement(item);
        if (!items.isEmpty()) {
            pickerList.setSelectedIndex(0);
            pickerList.ensureIndexIsVisible(0);
        }
    }

    private void rollPickerTo(int targetIndex, Runnable onFinished) {
        int count = pickerModel.size();
        if (count == 0) return;
        int frames = 36;
        int totalAdvance = 12 * 4 + 10 * 3 + 8 * 2 + 6;
        int direction = new Random().nextBoolean() ? 1 : -1;
        int start = Math.floorMod(targetIndex - direction * totalAdvance, count);
        pickerList.setSelectedIndex(start);
        pickerList.ensureIndexIsVisible(start);
        javax.swing.Timer timer = new javax.swing.Timer(42, null);
        final int[] frameNumber = {0};
        timer.addActionListener(e -> {
            int f = frameNumber[0]++;
            int step = f < 12 ? 4 : f < 22 ? 3 : f < 30 ? 2 : 1;
            int next = Math.floorMod(pickerList.getSelectedIndex() + direction * step, count);
            pickerList.setSelectedIndex(next);
            pickerList.ensureIndexIsVisible(next);
            timer.setDelay(Math.min(175, 36 + f * 4));
            if (frameNumber[0] >= frames) {
                timer.stop();
                pickerList.setSelectedIndex(targetIndex);
                pickerList.ensureIndexIsVisible(targetIndex);
                onFinished.run();
            }
        });
        timer.start();
    }

    private void addField(JPanel panel, GridBagConstraints c, String label, JComponent input) {
        c.gridy++;
        JLabel l = new JLabel(label);
        l.setFont(new Font("Segoe UI", Font.BOLD, 12));
        l.setForeground(INK);
        panel.add(l, c);
        c.gridy++;
        input.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        if (input instanceof DateTimePicker) input.setPreferredSize(new Dimension(320, 30));
        else input.setPreferredSize(new Dimension(100, 34));
        panel.add(input, c);
    }

    private void createCompetition() {
        final String eventTitle = title.getText().trim();
        final String group = groupId.getText().trim();
        final String code = new String(verificationCode.getPassword()).trim();
        final MetricOption selectedMetric = (MetricOption) subcategory.getSelectedItem();
        final String startIso;
        final String endIso;
        try {
            if (eventTitle.isEmpty()) throw new IllegalArgumentException("Enter an event title.");
            if (group.isEmpty() || !group.matches("\\d+")) throw new IllegalArgumentException("Enter your clan’s numeric Wise Old Man group ID.");
            if (code.isEmpty()) throw new IllegalArgumentException("Enter your group verification code.");
            if (selectedMetric == null) throw new IllegalArgumentException("Choose an event subcategory.");
            LocalDateTime start = startsAt.getValue();
            LocalDateTime end = endsAt.getValue();
            if (!end.isAfter(start)) throw new IllegalArgumentException("The end time must be after the start time.");
            ZoneId zone = ZoneId.systemDefault();
            startIso = start.atZone(zone).toInstant().toString();
            endIso = end.atZone(zone).toInstant().toString();
        } catch (Exception ex) {
            showError(ex.getMessage() == null ? "Check the event details and date format." : ex.getMessage());
            return;
        }

        configGroupId.setText(group);
        configVerificationCode.setText(code);
        if (!saveConfiguration()) return;

        createButton.setEnabled(false);
        status.setText("Creating event…");
        new SwingWorker<String, Void>() {
            @Override protected String doInBackground() throws Exception {
                String body = "{\"title\":" + quote(eventTitle)
                        + ",\"metric\":" + quote(selectedMetric.apiValue)
                        + ",\"startsAt\":" + quote(startIso)
                        + ",\"endsAt\":" + quote(endIso)
                        + ",\"groupId\":" + group
                        + ",\"groupVerificationCode\":" + quote(code) + "}";
                HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.wiseoldman.net/v2/competitions"))
                        .timeout(Duration.ofSeconds(45))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();
                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(15))
                        .build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() < 200 || response.statusCode() >= 300)
                    throw new IllegalStateException("Wise Old Man returned HTTP " + response.statusCode() + ": " + response.body());
                Matcher matcher = Pattern.compile("\\\"id\\\"\\s*:\\s*(\\d+)").matcher(response.body());
                if (matcher.find()) return matcher.group(1);
                throw new IllegalStateException("The event was created, but its ID could not be read from the response.");
            }
            @Override protected void done() {
                createButton.setEnabled(true);
                try {
                    String id = get();
                    status.setText("Event created successfully.");
                    int choice = JOptionPane.showConfirmDialog(frame,
                            "Your event is live on Wise Old Man. Open it now?",
                            "Event created", JOptionPane.YES_NO_OPTION, JOptionPane.INFORMATION_MESSAGE);
                    if (choice == JOptionPane.YES_OPTION) {
                        try { Desktop.getDesktop().browse(URI.create("https://wiseoldman.net/competitions/" + id)); }
                        catch (Exception ex) { showError("Could not open the event page: " + ex.getMessage()); }
                    }
                } catch (Exception ex) {
                    Throwable cause = ex.getCause() == null ? ex : ex.getCause();
                    status.setText("Could not create the event.");
                    String message = cause instanceof HttpTimeoutException
                            ? "Wise Old Man did not respond within 45 seconds. Check the competitions page before trying again, in case the event was created but the reply was delayed."
                            : cause.getMessage();
                    showError(message == null ? "The request failed. Check your internet connection and try again." : message);
                }
            }
        }.execute();
    }

    private void showError(String message) {
        JOptionPane.showMessageDialog(frame, message, "Wise Old Man", JOptionPane.ERROR_MESSAGE);
    }

    private static LocalDateTime defaultDateTime(int daysAhead) {
        return LocalDate.now().plusDays(daysAhead).atTime(20, 0);
    }

    private final class DateTimePicker extends JPanel {
        private final JButton dateButton = new JButton();
        private final JTextField timeField = new JTextField(8);
        private LocalDate selectedDate;

        DateTimePicker(LocalDateTime initial) {
            super(new FlowLayout(FlowLayout.LEFT, 6, 0));
            setOpaque(false);
            selectedDate = initial.toLocalDate();
            dateButton.setFont(new Font("Segoe UI", Font.PLAIN, 12));
            dateButton.setPreferredSize(new Dimension(150, 26));
            dateButton.setHorizontalAlignment(SwingConstants.CENTER);
            dateButton.setVerticalAlignment(SwingConstants.CENTER);
            dateButton.setToolTipText("Choose a date from the calendar");
            refreshDateButton();
            timeField.setFont(new Font("Segoe UI", Font.PLAIN, 13));
            timeField.setPreferredSize(new Dimension(90, 26));
            timeField.setHorizontalAlignment(JTextField.CENTER);
            timeField.setAlignmentY(Component.CENTER_ALIGNMENT);
            timeField.setText(initial.format(DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)));
            dateButton.addActionListener(e -> openCalendar());
            add(dateButton);
            add(new JLabel("at"));
            add(timeField);
        }

        LocalDateTime getValue() {
            String input = timeField.getText().trim();
            LocalTime time;
            try {
                time = LocalTime.parse(input, DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH));
            } catch (Exception first) {
                try {
                    time = LocalTime.parse(input, DateTimeFormatter.ofPattern("H:mm", Locale.ENGLISH));
                } catch (Exception second) {
                    throw new IllegalArgumentException("Enter a time like 8:00 PM or 20:00.");
                }
            }
            return selectedDate.atTime(time);
        }

        private void refreshDateButton() {
            dateButton.setText(selectedDate.format(DateTimeFormatter.ofPattern("EEE, MMM d, yyyy", Locale.ENGLISH)));
        }

        private void openCalendar() {
            JDialog dialog = new JDialog(frame, "Choose a date", true);
            dialog.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
            dialog.setSize(330, 330);
            dialog.setLocationRelativeTo(frame);
            JPanel content = new JPanel(new BorderLayout(8, 8));
            content.setBorder(new EmptyBorder(12, 12, 12, 12));
            JPanel monthBar = new JPanel(new BorderLayout(8, 0));
            JButton previous = new JButton("‹");
            JButton next = new JButton("›");
            JLabel monthTitle = new JLabel("", SwingConstants.CENTER);
            monthTitle.setFont(new Font("Segoe UI", Font.BOLD, 15));
            monthBar.add(previous, BorderLayout.WEST);
            monthBar.add(monthTitle, BorderLayout.CENTER);
            monthBar.add(next, BorderLayout.EAST);
            JPanel calendarGrid = new JPanel(new GridLayout(0, 7, 3, 3));
            JPanel footer = new JPanel(new FlowLayout(FlowLayout.RIGHT, 6, 0));
            JButton today = new JButton("Today");
            JButton cancel = new JButton("Cancel");
            footer.add(today);
            footer.add(cancel);
            final YearMonth[] visibleMonth = {YearMonth.from(selectedDate)};
            Runnable redraw = () -> {
                monthTitle.setText(visibleMonth[0].format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)));
                calendarGrid.removeAll();
                for (String weekday : new String[]{"M", "T", "W", "T", "F", "S", "S"}) {
                    JLabel label = new JLabel(weekday, SwingConstants.CENTER);
                    label.setForeground(MUTED);
                    calendarGrid.add(label);
                }
                int offset = visibleMonth[0].atDay(1).getDayOfWeek().getValue() - 1;
                for (int i = 0; i < offset; i++) calendarGrid.add(new JLabel(""));
                for (int day = 1; day <= visibleMonth[0].lengthOfMonth(); day++) {
                    int selectedDay = day;
                    JButton date = new JButton(Integer.toString(day));
                    date.setMargin(new Insets(2, 2, 2, 2));
                    LocalDate dateValue = visibleMonth[0].atDay(day);
                    if (dateValue.equals(selectedDate)) {
                        date.setBackground(ACCENT);
                        date.setForeground(Color.WHITE);
                    }
                    date.addActionListener(e -> {
                        selectedDate = visibleMonth[0].atDay(selectedDay);
                        refreshDateButton();
                        dialog.dispose();
                    });
                    calendarGrid.add(date);
                }
                calendarGrid.revalidate();
                calendarGrid.repaint();
            };
            previous.addActionListener(e -> { visibleMonth[0] = visibleMonth[0].minusMonths(1); redraw.run(); });
            next.addActionListener(e -> { visibleMonth[0] = visibleMonth[0].plusMonths(1); redraw.run(); });
            today.addActionListener(e -> { selectedDate = LocalDate.now(); refreshDateButton(); dialog.dispose(); });
            cancel.addActionListener(e -> dialog.dispose());
            redraw.run();
            content.add(monthBar, BorderLayout.NORTH);
            content.add(calendarGrid, BorderLayout.CENTER);
            content.add(footer, BorderLayout.SOUTH);
            dialog.setContentPane(content);
            dialog.setVisible(true);
        }
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }

    private void refreshSubcategories() {
        EventCategory selected = (EventCategory) category.getSelectedItem();
        if (selected == null) return;
        Object previous = subcategory.getSelectedItem();
        subcategory.removeAllItems();
        for (MetricOption option : selected.options) subcategory.addItem(option);
        if (previous instanceof MetricOption old) {
            for (int i = 0; i < subcategory.getItemCount(); i++) {
                if (subcategory.getItemAt(i).apiValue.equals(old.apiValue)) {
                    subcategory.setSelectedIndex(i);
                    break;
                }
            }
        }
    }

    private enum EventCategory {
        SKILLS("Skills", options("overall", "attack", "defence", "strength", "hitpoints", "ranged", "prayer", "magic", "cooking", "woodcutting", "fletching", "fishing", "firemaking", "crafting", "smithing", "mining", "herblore", "agility", "thieving", "slayer", "farming", "runecrafting", "hunter", "construction", "sailing")),
        BOSSES("Bosses", options("abyssal_sire", "alchemical_hydra", "amoxliatl", "araxxor", "artio", "barrows_chests", "brutus", "bryophyta", "callisto", "calvarion", "cerberus", "chambers_of_xeric", "chaos_elemental", "chaos_fanatic", "commander_zilyana", "corporeal_beast", "crazy_archaeologist", "dagannoth_prime", "dagannoth_rex", "dagannoth_supreme", "deranged_archaeologist", "doom_of_mokhaiotl", "duke_sucellus", "general_graardor", "giant_mole", "grotesque_guardians", "hespori", "kalphite_queen", "king_black_dragon", "kraken", "kreearra", "kril_tsutsaroth", "lunar_chests", "mad_angel", "maggot_king", "mimic", "nex", "nightmare", "phosanis_nightmare", "obor", "phantom_muspah", "sarachnis", "scorpia", "scurrius", "shellbane_gryphon", "skotizo", "spindel", "tempoross", "the_gauntlet", "the_corrupted_gauntlet", "the_hueycoatl", "the_leviathan", "the_royal_titans", "the_whisperer", "theatre_of_blood", "thermonuclear_smoke_devil", "tombs_of_amascut", "tombs_of_amascut_expert", "tztok_jad", "vardorvis", "venenatis", "vetion", "vorkath", "wintertodt", "yama", "zalcano", "zulrah")),
        ACTIVITIES("Activities", options("bounty_hunter_hunter", "bounty_hunter_rogue", "clue_scrolls_all", "clue_scrolls_beginner", "clue_scrolls_easy", "clue_scrolls_medium", "clue_scrolls_hard", "clue_scrolls_elite", "clue_scrolls_master", "last_man_standing", "pvp_arena", "soul_wars_zeal", "guardians_of_the_rift", "colosseum_glory", "collections_logged")),
        EFFICIENCY("Efficiency", options("ehp", "ehb"));

        final String label;
        final MetricOption[] options;
        EventCategory(String label, MetricOption[] options) { this.label = label; this.options = options; }
        @Override public String toString() { return label; }
    }

    private static MetricOption[] options(String... values) {
        MetricOption[] result = new MetricOption[values.length];
        for (int i = 0; i < values.length; i++) result[i] = new MetricOption(values[i]);
        return result;
    }

    private static final class MetricOption {
        final String apiValue;
        final String label;
        MetricOption(String apiValue) {
            this.apiValue = apiValue;
            StringBuilder formatted = new StringBuilder();
            for (String word : apiValue.replace('_', ' ').split(" ")) {
                if (formatted.length() > 0) formatted.append(' ');
                if (word.equals("of") || word.equals("the")) formatted.append(word);
                else formatted.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
            }
            this.label = formatted.toString();
        }
        @Override public String toString() { return label; }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(WiseOldManEventApp::new);
    }
}
