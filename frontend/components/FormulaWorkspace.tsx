"use client";

import { GridPreview } from "./workspace/GridPreview";
import { InstructionField } from "./workspace/InstructionField";
import { ModeSwitch } from "./workspace/ModeSwitch";
import { SheetControls } from "./workspace/SheetControls";
import { UploadZone } from "./workspace/UploadZone";
import { useFormulaWorkspace } from "./workspace/useFormulaWorkspace";
import { VerificationLedger } from "./workspace/VerificationLedger";

export function FormulaWorkspace() {
  const workspace = useFormulaWorkspace();

  return (
    <div id="workspace" className="mx-auto w-full max-w-content px-6">
      <div className="grid grid-cols-1 overflow-hidden rounded-panel border border-line bg-surface-1 shadow-panel md:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="flex flex-col gap-5 border-b border-line p-6 md:border-b-0 md:border-r md:p-8">
          <UploadZone
            fileName={workspace.file?.name ?? null}
            onSelect={workspace.selectFile}
          />
          {workspace.preview && (
            <>
              <SheetControls
                sheets={workspace.preview.sheets}
                sheet={workspace.sheet}
                onSheetChange={workspace.setSheet}
                target={workspace.target}
                onTargetChange={workspace.setTarget}
              />
              <ModeSwitch task={workspace.task} onChange={workspace.setTask} />
              <InstructionField
                task={workspace.task}
                instruction={workspace.instruction}
                onInstructionChange={workspace.setInstruction}
                current={workspace.current}
                onCurrentChange={workspace.setCurrent}
              />
              <button
                onClick={workspace.submit}
                disabled={workspace.loading}
                className="rounded-input bg-accent px-4 py-3 text-left text-sm font-semibold text-surface-0 transition-transform hover:-translate-y-px disabled:opacity-60"
              >
                {workspace.loading ? "Checking formula…" : "Forge formula →"}
              </button>
            </>
          )}
          {workspace.error && (
            <p role="alert" className="text-sm text-danger">
              {workspace.error}
            </p>
          )}
        </div>
        <div className="min-h-[320px] p-2 md:min-h-[460px]">
          <GridPreview
            grid={workspace.grid}
            nonEmptyCellCount={workspace.preview?.non_empty_cell_count ?? null}
            targetCell={
              workspace.preview ? workspace.target.toUpperCase() : null
            }
          />
        </div>
      </div>

      <VerificationLedger
        loading={workspace.loading}
        result={workspace.result}
        isStubModel={workspace.isStubModel}
        onDownload={workspace.download}
        downloading={workspace.downloading}
      />
    </div>
  );
}
