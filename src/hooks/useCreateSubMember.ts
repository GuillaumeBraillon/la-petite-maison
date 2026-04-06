import { useCallback } from "react";
import type { CreateSubMemberInput, Member } from "../types";
import { useToast } from "../contexts/ToastContext";
import { createMember } from "../services/apiCrud";
import { TOAST_MESSAGES } from "../services/messageCatalog";

interface UseCreateSubMemberOptions {
  onRefresh: () => Promise<void>;
}

export const useCreateSubMember = ({ onRefresh }: UseCreateSubMemberOptions) => {
  const { showToast } = useToast();

  return useCallback(
    async (data: CreateSubMemberInput): Promise<Member> => {
      try {
        const newMember = await createMember({
          firstName: data.firstName,
          lastName: data.lastName,
          label: data.label,
          role: data.role,
          email: undefined,
          address: undefined,
          ownerId: data.ownerId,
          isAllowed: false,
          isEditor: false,
        });

        await onRefresh();
        showToast({
          variant: "success",
          title: TOAST_MESSAGES.member.created.title,
          message: TOAST_MESSAGES.member.created.message,
        });

        return newMember;
      } catch (error) {
        showToast({
          variant: "error",
          title: TOAST_MESSAGES.member.saveError.title,
          message: TOAST_MESSAGES.member.saveError.message,
        });
        throw error;
      }
    },
    [onRefresh, showToast]
  );
};
