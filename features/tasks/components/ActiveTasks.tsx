import { DRAG_ACTIVATION_DELAY_MS } from '@/shared/constants/timing';
import { strings } from '@/shared/lib/strings';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from 'expo-router';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';
import { useCreateTask } from '@/features/tasks/CreateTaskContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTaskActions } from '@/features/tasks/lib/useTaskActions';
import { useTheme } from '@/shared/providers/ThemeContext';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';
import { createActiveTasksStyles } from '@/features/tasks/components/activeTasksStyles';
import TaskFilterBar from '@/features/tasks/components/filters/TaskFilterBar';
import TaskFilterSheet from '@/features/tasks/components/filters/TaskFilterSheet';
import TaskSearchBar from '@/features/tasks/components/filters/TaskSearchBar';
import TaskSortSheet from '@/features/tasks/components/filters/TaskSortMenu';
import ActiveDayCalendar from '@/features/tasks/components/calendar/ActiveDayCalendar';
import EmptyState from '@/shared/ui/EmptyState';
import { tokens } from '@/shared/constants/theme';
import { useTaskReorder } from '@/features/tasks/lib/useTaskReorder';
import { useActiveTaskFilters } from '@/features/tasks/lib/useActiveTaskFilters';
import type { Task } from '@/types';
import { isWeb } from '@/shared/lib/platform';


export default function ActiveTasks() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const styles = useMemo(() => createActiveTasksStyles(colors), [colors]);
  const { categories, tags, loading } = useTasks();
  const { setScheduledDay } = useCreateTask();
  const {
    activeTasks,
    searchOpen,
    searchQuery,
    setSearchQuery,
    hasSearch,
    toggleSearch,
    sortMode,
    handleSelectSort,
    selectedDay,
    setSelectedDay,
    dayTaskCounts,
    validCategoryIds,
    validTagIds,
    maxFilterSelections,
    hasFilters,
    hasListConstraints,
    filteredTasks,
    canReorder,
    handleToggleCategory,
    handleToggleTag,
    clearFilters,
    emptyCopy,
    setSelectedCategoryIds,
    setSelectedTagIds,
  } = useActiveTaskFilters();
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  useEffect(() => {
    setScheduledDay('active', selectedDay);
  }, [selectedDay, setScheduledDay]);

  const { handleToggle, handleDelete } = useTaskActions();

  const openFilterSheet = useCallback(() => setShowFilterSheet(true), []);
  const openSortSheet = useCallback(() => setShowSortSheet(true), []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isMobile && hasFilters ? '' : strings.nav.allTasks,
      headerRight: () => (
        <TaskFilterBar
          variant="header"
          categories={categories}
          tags={tags}
          selectedCategoryIds={validCategoryIds}
          selectedTagIds={validTagIds}
          onOpen={openFilterSheet}
          onClear={clearFilters}
          searchOpen={searchOpen}
          searchHasQuery={hasSearch}
          onToggleSearch={toggleSearch}
          sortMode={sortMode}
          onOpenSort={openSortSheet}
        />
      ),
    });
  }, [
    navigation,
    isMobile,
    categories,
    tags,
    hasFilters,
    validCategoryIds,
    validTagIds,
    clearFilters,
    searchOpen,
    hasSearch,
    toggleSearch,
    sortMode,
    openFilterSheet,
    openSortSheet,
  ]);

  const { handleDragEnd, moveTask } = useTaskReorder({
    activeTasks,
    filteredTasks,
    canReorder,
    hasListConstraints,
  });

  const renderNativeItem = useCallback<SortableGridRenderItem<Task>>(
    ({ item, index }) => (
      <View style={styles.itemWrap}>
        <Sortable.Handle
          mode={canReorder ? 'draggable' : 'non-draggable'}
          style={styles.itemHandle}>
          <ToDoItem
            task={item}
            index={index}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </Sortable.Handle>
      </View>
    ),
    [canReorder, handleDelete, handleToggle, styles.itemHandle, styles.itemWrap]
  );

  const renderWebItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <View style={styles.itemWrap}>
        <ToDoItem
          task={item}
          index={index}
          onToggle={handleToggle}
          onDelete={handleDelete}
          showReorderButtons={canReorder}
          canMoveUp={canReorder && index > 0}
          canMoveDown={canReorder && index < filteredTasks.length - 1}
          onMoveUp={() => moveTask(item.id, -1)}
          onMoveDown={() => moveTask(item.id, 1)}
        />
      </View>
    ),
    [
      canReorder,
      filteredTasks.length,
      handleDelete,
      handleToggle,
      moveTask,
      styles.itemWrap,
    ]
  );

  const emptyComponent = (
    <EmptyState title={emptyCopy.title} text={emptyCopy.text} />
  );

  const listContentStyle = [
    styles.tasksContent,
    styles.tasksContentPad,
    !isWeb && styles.tasksContentDragPad,
    filteredTasks.length === 0 && styles.tasksContentEmpty,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.contentInset}>
        <TaskSearchBar
          visible={searchOpen}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {loading ? (
          <>
            <ActiveDayCalendar
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              dayTaskCounts={dayTaskCounts}
            />
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{strings.common.loadingTasks}</Text>
            </View>
          </>
        ) : (
          <View style={styles.listArea}>
            {isWeb ? (
              <FlatList
                style={styles.tasksList}
                contentContainerStyle={listContentStyle}
                data={filteredTasks}
                keyExtractor={(item) => String(item.id)}
                ListHeaderComponent={
                  <ActiveDayCalendar
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                    dayTaskCounts={dayTaskCounts}
                  />
                }
                ListEmptyComponent={emptyComponent}
                renderItem={renderWebItem}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <Animated.ScrollView
                ref={scrollableRef}
                style={styles.tasksList}
                contentContainerStyle={listContentStyle}
                keyboardShouldPersistTaps="handled">
                <ActiveDayCalendar
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  dayTaskCounts={dayTaskCounts}
                />
                {filteredTasks.length === 0 ? (
                  emptyComponent
                ) : (
                  <Sortable.Grid
                    columns={1}
                    data={filteredTasks}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderNativeItem}
                    onDragEnd={handleDragEnd}
                    scrollableRef={scrollableRef}
                    customHandle
                    sortEnabled={canReorder}
                    dragActivationDelay={DRAG_ACTIVATION_DELAY_MS}
                    activeItemScale={1.04}
                    inactiveItemOpacity={1}
                    hapticsEnabled
                    itemEntering={null}
                    itemExiting={null}
                    itemsLayoutTransitionMode="reorder"
                  />
                )}
              </Animated.ScrollView>
            )}
          </View>
        )}
      </View>

      <TaskFilterSheet
        visible={showFilterSheet}
        categories={categories}
        tags={tags}
        selectedCategoryIds={validCategoryIds}
        selectedTagIds={validTagIds}
        maxFilterSelections={maxFilterSelections}
        onClearCategories={() => setSelectedCategoryIds([])}
        onToggleCategory={handleToggleCategory}
        onClearTags={() => setSelectedTagIds([])}
        onToggleTag={handleToggleTag}
        onClear={clearFilters}
        onClose={() => setShowFilterSheet(false)}
      />

      <TaskSortSheet
        visible={showSortSheet}
        mode={sortMode}
        onSelect={handleSelectSort}
        onClose={() => setShowSortSheet(false)}
      />
    </View>
  );
}
