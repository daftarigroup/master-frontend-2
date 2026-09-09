import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      return {
        success: true,
        data: {
          id: `usr-${Date.now()}`,
          ...payload,
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
