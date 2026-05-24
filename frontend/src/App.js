import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Box, Typography, Paper, Grid } from '@mui/material';
import './App.css';

const App = () => {
  const [columns, setColumns] = useState([
    {
      id: '1',
      name: 'To Do',
      tasks: [
        { id: '1', title: 'Task 1', description: 'Complete the report', employee: 'John Doe' },
        { id: '2', title: 'Task 2', description: 'Prepare presentation', employee: 'Jane Smith' },
      ],
    },
    {
      id: '2',
      name: 'In Progress',
      tasks: [
        { id: '3', title: 'Task 3', description: 'Develop feature X', employee: 'Alice Johnson' },
        { id: '4', title: 'Task 4', description: 'Fix bug Y', employee: 'Bob Brown' },
      ],
    },
    {
      id: '3',
      name: 'Done',
      tasks: [
        { id: '5', title: 'Task 5', description: 'Deploy to production', employee: 'Charlie Green' },
        { id: '6', title: 'Task 6', description: 'Update documentation', employee: 'Diana White' },
      ],
    },
  ]);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find((col) => col.id === destination.droppableId);
    const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
    destColumn.tasks.splice(destination.index, 0, movedTask);

    setColumns([...columns]);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Jira-like Kanban Board
      </Typography>
      <DragDropContext onDragEnd={onDragEnd}>
        <Grid container spacing={2}>
          {columns.map((column) => (
            <Grid item xs={12} sm={4} key={column.id}>
              <Paper elevation={3} sx={{ padding: 2 }}>
                <Typography variant="h6" align="center" gutterBottom>
                  {column.name}
                </Typography>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ minHeight: 200, backgroundColor: '#f9f9f9', padding: 1, borderRadius: 1 }}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <Paper
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{ padding: 2, marginBottom: 1, backgroundColor: '#fff' }}
                            >
                              <Typography variant="subtitle1" gutterBottom>
                                {task.title}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {task.description}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Assigned to: {task.employee}
                              </Typography>
                            </Paper>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>
    </Box>
  );
};

export default App;
