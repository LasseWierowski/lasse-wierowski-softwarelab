import { produce } from 'immer';

import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'running' | 'done';
  assignee: string;
}

interface TaskTrackerState {
  tasks: Task[];
  tasksById: Record<string, Task>;
  projectName: string;
}

const initialState: TaskTrackerState = {
  tasks: [
    { id: 'task-1', title: 'Setup project', status: 'done', assignee: 'alice' },
    { id: 'task-2', title: 'Build components', status: 'running', assignee: 'bob' },
    { id: 'task-3', title: 'Write tests', status: 'todo', assignee: 'alice' },
  ],
  tasksById: {
    'task-1': { id: 'task-1', title: 'Setup project', status: 'done', assignee: 'alice' },
    'task-2': { id: 'task-2', title: 'Build components', status: 'running', assignee: 'bob' },
    'task-3': { id: 'task-3', title: 'Write tests', status: 'todo', assignee: 'alice' },
  },
  projectName: 'My Project',
};

describe('immutable updates', () => {


  test('updating a task creates new references for changed parts only', () => {
    const nextState = produce(initialState, draft => {
      const task = draft.tasks.find(t => t.id === 'task-2')!;
      task.status = 'done';
      draft.tasksById['task-2'].status = 'done';
    });

    expect(nextState).not.toBe(initialState);

    expect(nextState.tasks[1]).not.toBe(initialState.tasks[1]);
    expect(nextState.tasksById['task-2']).not.toBe(initialState.tasksById['task-2']);

    expect(nextState.tasks[0]).toBe(initialState.tasks[0]);
    expect(nextState.tasks[2]).toBe(initialState.tasks[2]);

    expect(nextState.projectName).toBe(initialState.projectName);
  });

  //test nummer 2
  test('direct mutation is invisible to reference checks', () => {
    const plainState = {
        tasks: [{ id: 'task-1', title: 'Setup project', status: 'done' as const, assignee: 'alice' }],
        tasksById: {},
        projectName: 'My Project',
    };

    const taskRef = plainState.tasks[0];
    plainState.tasks[0].title = 'changed';

    expect(plainState.tasks[0]).toBe(taskRef);
    expect(plainState.tasks[0].title).toBe('changed');

    const nextState = produce(initialState, draft => {
        draft.tasks[0].status = 'in-progress';
    });

    expect(() => {
        nextState.tasks[0].title = 'changed';
    }).toThrow();
  });

  //test nummer 3
  test('hasChanged utility only triggers for affected slices', () => {
    function hasChanged<T, S>(
        oldState: T,
        newState: T,
        selector: (state: T) => S
    ): boolean {
        return selector(oldState) !== selector(newState);
    }

    const stateWithNewTask = produce(initialState, draft => {
        draft.tasks[0].status = 'in-progress';
    });

    expect(hasChanged(initialState, stateWithNewTask, s => s.tasks)).toBe(true);
    expect(hasChanged(initialState, stateWithNewTask, s => s.projectName)).toBe(false);

    const stateWithNewName = produce(initialState, draft => {
        draft.projectName = 'New Project';
    });

    expect(hasChanged(initialState, stateWithNewName, s => s.tasks)).toBe(false);
    expect(hasChanged(initialState, stateWithNewName, s => s.projectName)).toBe(true);

      // Das ist das wichtigste bei selector basiertem State management: Jede Komponente abonniert nur den Teil des States den sie braucht und verwendet.
    // hasChanged entscheidet in einer operation ob ein Re render nötig ist

  });

  //test nummer 4
  test('list vs dictionary lookup tradeoff', () => {
    const bigState: TaskTrackerState = {
        tasks: Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'todo' as const,
        assignee: 'alice'
        })),
        tasksById: Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [
            `task-${i}`,
            { id: `task-${i}`, title: `Task ${i}`, status: 'todo' as const, assignee: 'alice' }
        ])
        ),
        projectName: 'Big Project'
    };

    const nextState = produce(bigState, draft => {
        draft.tasks[500].status = 'in-progress';
        draft.tasksById['task-500'].status = 'in-progress';
    });

    // beide Strukturen  neue Referenzen
    expect(nextState.tasks).not.toBe(bigState.tasks);
    expect(nextState.tasksById).not.toBe(bigState.tasksById);

    expect(nextState.tasks[500]).not.toBe(bigState.tasks[500]);
    expect(nextState.tasksById['task-500']).not.toBe(bigState.tasksById['task-500']);

    expect(nextState.tasks[0]).toBe(bigState.tasks[0]);
    expect(nextState.tasks[999]).toBe(bigState.tasks[999]);

    // Bei Array muss alle Elemente durchgehen bis task 500 gefunden wird
   // Bei zb 1000 Subscribers die je einen anderen Task beobachten: 1000x Array.find()
    function hasTask500ChangedArray(oldState: TaskTrackerState, newState: TaskTrackerState): boolean {
        const oldTask = oldState.tasks.find(t => t.id === 'task-500');
        const newTask = newState.tasks.find(t => t.id === 'task-500');
        return oldTask !== newTask;
    }

    // Dictionary: direkter Zugriff per key 
    // Bei 1000 Subscribers: 1000x ein einziger Property-Zugriff
    function hasTask500ChangedDict(oldState: TaskTrackerState, newState: TaskTrackerState): boolean {
        return oldState.tasksById['task-500'] !== newState.tasksById['task-500'];
    }

    expect(hasTask500ChangedArray(bigState, nextState)).toBe(true);
    expect(hasTask500ChangedDict(bigState, nextState)).toBe(true);

    expect(hasTask500ChangedArray(bigState, bigState)).toBe(false);
    expect(hasTask500ChangedDict(bigState, bigState)).toBe(false);
  });


  //test 5
  test('subscribeToSlice only fires callback when selected slice changes', () => {
    function subscribeToSlice<T, S>(
        selector: (state: T) => S,
        initialState: T,
        callback: () => void
    ): (newState: T) => void {
        let currentSlice = selector(initialState);

        return (newState: T) => {
        const newSlice = selector(newState);
        if (newSlice !== currentSlice) {
            currentSlice = newSlice;
            callback();
        }
        };
    }

    let callCount = 0;
    const notify = subscribeToSlice(
        s => s.tasks,
        initialState,
        () => callCount++
    );

    const stateWithChangedTask = produce(initialState, draft => {
        draft.tasks[0].status = 'in-progress';
    });
    notify(stateWithChangedTask);
    expect(callCount).toBe(1);

    const stateWithNewName = produce(stateWithChangedTask, draft => {
        draft.projectName = 'New Project';
    });
    notify(stateWithNewName);
    expect(callCount).toBe(1);

    // Jede Komponente bekommt ihren eigenen notify Aufruf nach jedem dispatch
    // Nur wenn der Selector eine neue Referenz zurückgibt wird die Komponente neu gerendert und alles andere wird still ignoriert.
 
  });

  //test 6
  test('RTK slice uses immer under the hood', () => {
    const taskSlice = createSlice({
        name: 'tasks',
        initialState,
        reducers: {
        updateTaskStatus: (state, action: PayloadAction<{ id: string; status: Task['status'] }>) => {
            const task = state.tasks.find(t => t.id === action.payload.id)!;
            task.status = action.payload.status;
            state.tasksById[action.payload.id].status = action.payload.status;
        }
        }
    });

    const store = configureStore({ reducer: taskSlice.reducer });
    const before = store.getState();

    store.dispatch(taskSlice.actions.updateTaskStatus({ id: 'task-2', status: 'done' }));

    const after = store.getState();

    expect(after).not.toBe(before);
    expect(after.tasks[1]).not.toBe(before.tasks[1]);
    expect(after.tasksById['task-2']).not.toBe(before.tasksById['task-2']);
    expect(after.tasks[0]).toBe(before.tasks[0]);
    expect(after.tasks[2]).toBe(before.tasks[2]);

    // RTK bettet Immer direkt in createSlice ein also man schreibt nur Mutation,
    // Immer macht daraus einen neuen State. Gleiche art wie bei produce().
  });

});

