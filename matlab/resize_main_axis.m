function resize_main_axis
global vars handles

figure(9)
if vars.EK*1000 <=-95
    set(handles.mainplot,'DrawMode','fast', 'XTickLabelMode', 'manual', ...
    'YTickLabelMode','manual', 'YLim', [-150 60], 'YTick', -150:20:60, ...
    'YTickLabel', -150:20:60, 'ButtonDownFcn', 'set_cursor_vis(''off'')');
else
      set(handles.mainplot,'DrawMode','fast', 'XTickLabelMode', 'manual', ...
    'YTickLabelMode','manual', 'YLim', [-100 60], 'YTick', -100:20:60, ...
    'YTickLabel', -100:20:60, 'ButtonDownFcn', 'set_cursor_vis(''off'')');
 end