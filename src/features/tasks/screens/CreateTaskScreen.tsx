import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useToast } from '../../../shared/components/Toast';
import { useCreateTaskMutation } from '../services/taskApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import DateField from '../../../shared/components/DateField';
import Dropdown from '../../../shared/components/Dropdown';
import ResourcePicker from '../../../shared/components/ResourcePicker';
import { useMyResources } from '../../../shared/hooks/useMyResources';

const PRIORITIES = [
  { id: 1, label: 'Low',    color: '#94A3B8' },
  { id: 2, label: 'Medium', color: '#F9BA53' },
  { id: 3, label: 'High',   color: '#F76161' },
];

const CreateTaskScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const headerSubColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.8)';
  const toast = useToast();
  const [createTask, { isLoading }] = useCreateTaskMutation();

  // Single source of truth for "who can I act for / assign to"
  const { permissions, onBehalfOf, selfId } = useMyResources();
  const canAssign   = permissions.canAssign;
  const hasOnBehalf = canAssign && onBehalfOf.length > 1;

  const [taskName, setTaskName]     = useState('');
  const [taskDetail, setTaskDetail] = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [assignedTo, setAssignedTo] = useState<string>(selfId);
  const [assignor, setAssignor]     = useState<string>(selfId);
  const [priority, setPriority]     = useState(2);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmit = async () => {
    if (!taskName.trim()) { toast.warning('Required', 'Please enter a task name.'); return; }
    if (!startDate.trim() || !endDate.trim()) { toast.warning('Required', 'Please enter start and end dates.'); return; }

    try {
      await createTask({
        taskName,
        taskDetail: taskDetail || null,
        startDate,
        endDate,
        assignedTo: (canAssign ? assignedTo : selfId) || selfId,
        assignor: hasOnBehalf ? assignor : selfId,
        priorityId: priority,
        taskCategoryId: 1,
        isCompleted,
      }).unwrap();
      toast.success(
        isCompleted ? 'Task Completed' : 'Task Created',
        isCompleted ? 'Task was created and marked complete.' : 'Your task has been created successfully.',
      );
      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      toast.error('Failed', 'Could not create task. Please try again.');
    }
  };

  const headerSubtitle = canAssign
    ? (permissions.isDelegate && !permissions.isManager
        ? 'You can assign on behalf of others'
        : `You can assign tasks to your team${permissions.isBypass ? ' (bypass)' : ''}`)
    : 'Task will be assigned to you';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { backgroundColor: colors.stackHeaderBackground }]}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={[styles.headerTitle, { color: colors.stackHeaderText }]}>Create New Task</Text>
          <Text style={[styles.headerSub, { color: headerSubColor }]}>{headerSubtitle}</Text>
        </View>

        <View style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Task Name <Text style={{ color: colors.danger }}>*</Text></Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={taskName} onChangeText={setTaskName} placeholder="Enter task name" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Description</Text>
          <TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={taskDetail} onChangeText={setTaskDetail} placeholder="Task details..." placeholderTextColor={colors.textMuted}
            multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        {hasOnBehalf && (
          <View style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
            <ResourcePicker
              label="On Behalf Of"
              variant="onBehalfOf"
              value={assignor}
              onChange={setAssignor}
            />
          </View>
        )}

        <View style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
          <ResourcePicker
            label="Assign To"
            required
            variant="assignee"
            value={assignedTo}
            onChange={setAssignedTo}
          />
        </View>

        <View style={styles.dateRow}>
          <View style={[styles.dateField, styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.text }]}>Start Date <Text style={{ color: colors.danger }}>*</Text></Text>
            <DateField value={startDate} onChange={setStartDate} max={endDate || undefined} />
          </View>
          <View style={[styles.dateField, styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.text }]}>End Date <Text style={{ color: colors.danger }}>*</Text></Text>
            <DateField value={endDate} onChange={setEndDate} min={startDate || undefined} />
          </View>
        </View>

        <View style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
          <Dropdown
            value={priority}
            onChange={(v) => setPriority(v as number)}
            options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))}
            placeholder="Select priority..."
          />
        </View>

        <TouchableOpacity
          style={[styles.checkRow, shadows.card, { backgroundColor: colors.card, borderColor: isCompleted ? colors.success : colors.border }]}
          onPress={() => setIsCompleted((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.checkBox, { color: isCompleted ? colors.success : colors.textMuted }]}>
            {isCompleted ? '☑️' : '⬜'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.checkTitle, { color: colors.text }]}>Is Task Completed?</Text>
            <Text style={[styles.checkHint, { color: colors.textMuted }]}>
              Check the box if the task is already completed.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: isCompleted ? colors.success : colors.primary, opacity: isLoading ? 0.6 : 1 }]}
          onPress={handleSubmit} activeOpacity={0.7} disabled={isLoading}>
          <Text style={styles.submitText}>
            {isLoading
              ? (isCompleted ? 'Completing…' : 'Creating…')
              : (isCompleted ? '✅  Create & Complete' : '📋  Create Task')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 24, alignItems: 'center' },
  headerEmoji: { fontSize: 32, marginBottom: 6, opacity: 0.6 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub:   { fontSize: 12, marginTop: 4 },
  fieldCard:   { marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14 },
  label:       { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80 },
  dateRow:     { flexDirection: 'row', gap: 0 },
  dateField:   { flex: 1 },
  checkRow:    { marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 14, borderWidth: 1,
                 flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkBox:    { fontSize: 22 },
  checkTitle:  { fontSize: 14, fontWeight: '700' },
  checkHint:   { fontSize: 11, marginTop: 2 },
  submitBtn:   { marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default CreateTaskScreen;
