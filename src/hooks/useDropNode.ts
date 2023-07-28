import { useCallback, useContext } from "react";
import { useDrop, DragElementWrapper } from "react-dnd";
import { ItemTypes } from "~/ItemTypes";
import { PlaceholderContext } from "~/providers";
import { NodeModel } from "~/types";
import { isDroppable, getDropTarget, isNodeModel } from "~/utils";
import { useTreeContext } from "~/hooks";
import _ from "lodash";

export const useDropNode = <T>(
  item: NodeModel<T>,
  ref: React.RefObject<HTMLElement>
): [boolean, NodeModel<T>, DragElementWrapper<HTMLElement>] => {
  const treeContext = useTreeContext<T>();
  const placeholderContext = useContext(PlaceholderContext);

  const debounceShow = useCallback(
    _.throttle(placeholderContext.showPlaceholder, 300, {
      leading: false,
      trailing: true,
    }),
    []
  );
  const debounceHide = useCallback(
    _.throttle(placeholderContext.hidePlaceholder, 300, {
      leading: false,
      trailing: true,
    }),
    []
  );

  const [{ isOver, dragSource }, drop] = useDrop({
    accept: [ItemTypes.TREE_ITEM, ...treeContext.extraAcceptTypes],
    drop: (dragItem: any, monitor) => {
      const { dropTargetId, index } = placeholderContext;

      if (
        monitor.isOver({ shallow: true }) &&
        dropTargetId !== undefined &&
        index !== undefined
      ) {
        // If the drag source is outside the react-dnd,
        // a different object is passed than the NodeModel.
        treeContext.onDrop(
          isNodeModel<T>(dragItem) ? dragItem : null,
          dropTargetId,
          index
        );
      }

      placeholderContext.hidePlaceholder();
    },
    canDrop: (dragItem, monitor) => {
      if (monitor.isOver({ shallow: true })) {
        const dropTarget = getDropTarget<T>(
          item,
          ref.current,
          monitor,
          treeContext
        );

        if (dropTarget === null) {
          return false;
        }

        return isDroppable(dragItem, dropTarget.id, treeContext);
      }

      return false;
    },
    hover: (dragItem, monitor) => {
      if (monitor.isOver({ shallow: true })) {
        const { dropTargetId, index, showPlaceholder, hidePlaceholder } =
          placeholderContext;

        const dropTarget = getDropTarget<T>(
          item,
          ref.current,
          monitor,
          treeContext
        );

        if (
          dropTarget === null ||
          !isDroppable(dragItem, dropTarget.id, treeContext)
        ) {
          if (placeholderContext.dropTargetId) {
            debounceHide();
          }
          return;
        }

        if (dropTarget.id !== dropTargetId || dropTarget.index !== index) {
          debounceShow(dropTarget.id, dropTarget.index);
        }
      }
    },
    collect: (monitor) => {
      const dragSource: NodeModel<T> = monitor.getItem();

      return {
        isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
        dragSource,
      };
    },
  });

  return [isOver, dragSource, drop];
};
