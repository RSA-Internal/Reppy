package panda.reppy.entities;

import net.dv8tion.jda.api.EmbedBuilder;
import net.dv8tion.jda.api.entities.Member;
import net.dv8tion.jda.api.entities.MessageEmbed;
import panda.reppy.database.ModelDao;
import panda.reppy.database.models.DatabaseModel;

import java.util.List;

public class AnswerEmbed {

    public static MessageEmbed generateAnswerEmbed(Member author, String content, String postId, boolean fetchVoteData, boolean isAccepted) {
        int upvotes = 0;
        int downvotes = 0;

        if (fetchVoteData) {
            List<DatabaseModel> voteList = ModelDao.retrieveModelsByField("votes", "postId", postId);

            for (DatabaseModel model : voteList) {
                if (model.getAccepted()) {
                    upvotes++;
                } else {
                    downvotes++;
                }
            }
        }

        EmbedBuilder builder = new EmbedBuilder()
                .setTitle("Answer by: " + author.getEffectiveName())
                .setDescription(isAccepted ? "Accepted by OP" : "\u200b")
                .addField("\u200b", content, false)
                .addField("\u200b",
                        String.format("%s <:upvote:934992735033761832>%n%s <:downvote:934992734945685504>",
                                upvotes, downvotes),
                        false);

        return builder.build();
    }
}
