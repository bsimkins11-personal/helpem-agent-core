#!/usr/bin/env python3
"""
Remove old ViewModel declarations from View files to avoid conflicts with new Architecture ViewModels
"""

import re

files_to_fix = {
    'ios/HelpEmApp/Views/Tribe/TribeDetailView.swift': ('TribeDetailViewModel', 392),
    'ios/HelpEmApp/Views/Tribe/TribeInboxView.swift': ('TribeInboxViewModel', 366),
    'ios/HelpEmApp/Views/Tribe/TribeListView.swift': ('TribeListViewModel', 252),
    'ios/HelpEmApp/Views/Tribe/TribeMessagesView.swift': ('TribeMessagesViewModel', 111),
}

replacement_comment = """// MARK: - View Model
// Note: {viewmodel_name} has been moved to Architecture/ViewModels/{viewmodel_name}.swift
// This provides better separation of concerns and follows Clean Architecture principles
"""

for filepath, (viewmodel_name, start_line) in files_to_fix.items():
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()
        
        # Find the start of the ViewModel section
        viewmodel_start = None
        for i in range(start_line - 1, min(start_line + 5, len(lines))):
            if f'class {viewmodel_name}' in lines[i]:
                # Go back to find the MARK comment
                for j in range(i, max(0, i-5), -1):
                    if '// MARK: - View Model' in lines[j]:
                        viewmodel_start = j
                        break
                break
        
        if viewmodel_start is None:
            print(f"Could not find ViewModel in {filepath}")
            continue
        
        # Find the end of the ViewModel class
        viewmodel_end = None
        brace_count = 0
        started = False
        
        for i in range(viewmodel_start, len(lines)):
            if f'class {viewmodel_name}' in lines[i]:
                started = True
            
            if started:
                brace_count += lines[i].count('{')
                brace_count -= lines[i].count('}')
                
                if brace_count == 0 and '{' in lines[i]:
                    viewmodel_end = i + 1
                    break
        
        if viewmodel_end is None:
            print(f"Could not find end of ViewModel in {filepath}")
            continue
        
        # Replace the ViewModel section with a comment
        new_lines = (
            lines[:viewmodel_start] +
            [replacement_comment.format(viewmodel_name=viewmodel_name) + '\n'] +
            lines[viewmodel_end:]
        )
        
        # Write back
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        
        print(f"✅ Removed {viewmodel_name} from {filepath}")
        print(f"   Lines {viewmodel_start+1} to {viewmodel_end} replaced with comment")
    
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")

print("\n🎉 Done! Old ViewModels removed from View files.")
